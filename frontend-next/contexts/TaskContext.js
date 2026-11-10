'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import useTaskManagement from '../hooks/useTaskManagement';
import { addTask, updateTaskFields, getSubtaskCounts } from "../service";
import { startInProgressSession } from "../lib/inProgressTimer";
import { useUI } from './UIContext';
import { calculatePredecessor, calculatePredecessorUnfiltered } from '../lib/dragUtils';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const taskManagement = useTaskManagement();
    const { darkMode } = useUI();
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [popupDate, setPopupDate] = useState("");
    const [popupTaskItem, setPopupTaskItem] = useState(null);
    const [detailTaskId, setDetailTaskId] = useState(null);
    const [subtaskCounts, setSubtaskCounts] = useState({});

    // Checklist badges for every task row, refreshed whenever the task lists
    // reload so totals stay correct without a per-row request.
    const refreshSubtaskCounts = useCallback(async () => {
        try {
            const rows = await getSubtaskCounts();
            const next = {};
            (Array.isArray(rows) ? rows : []).forEach(({ taskId, total, done }) => {
                next[taskId] = { total, done };
            });
            setSubtaskCounts(next);
        } catch (err) {
            console.error('getSubtaskCounts backend failed:', err);
        }
    }, []);

    useEffect(() => {
        // Defer one tick: the fetch resolves later and must not set state during
        // the effect body (cascading-render guard).
        const timer = setTimeout(refreshSubtaskCounts, 0);
        return () => clearTimeout(timer);
    }, [refreshSubtaskCounts, taskManagement.taskDays, taskManagement.completedTasks, taskManagement.overdueTasks]);

    const toggleProject = (project) => {
        setSelectedProjects(prev => {
            if (prev.includes(project)) {
                return prev.filter(p => p !== project);
            } else {
                return [...prev, project];
            }
        });
    };

    const isTaskVisible = (task) => {
        if (!task.category || task.category === "None") return true;
        if (selectedProjects.length === 0) return true;
        return selectedProjects.includes(task.category);
    };

    const filteredTaskDays = Object.keys(taskManagement.taskDays).reduce((acc, date) => {
        const tasks = taskManagement.taskDays[date].filter(isTaskVisible).sort((a, b) => a.dayOrder - b.dayOrder);
        if (tasks.length > 0) {
            acc[date] = tasks;
        }
        return acc;
    }, {});

    const filteredCompletedTasks = Object.keys(taskManagement.completedTasks).reduce((acc, date) => {
        const tasks = taskManagement.completedTasks[date].filter(isTaskVisible);
        if (tasks.length > 0) {
            acc[date] = tasks;
        }
        return acc;
    }, {});

    const filteredOverdueTasks = {
        overdue: (taskManagement.overdueTasks.overdue || []).filter(isTaskVisible)
    };

    const callPopup = (date, task = null) => {
        setPopupDate(date);
        setPopupTaskItem(task);
        setShowPopup(true);
    };

    // Resolve the live task so the drawer reflects list edits and completion.
    const findTaskById = (id) => {
        if (id === null || id === undefined) return null;
        const targetId = id.toString();
        for (const date in taskManagement.taskDays) {
            const match = taskManagement.taskDays[date].find(t => t.id.toString() === targetId);
            if (match) return match;
        }
        for (const date in taskManagement.completedTasks) {
            const match = taskManagement.completedTasks[date].find(t => t.id.toString() === targetId);
            if (match) return match;
        }
        return (taskManagement.overdueTasks.overdue || []).find(t => t.id.toString() === targetId) || null;
    };

    const detailTask = findTaskById(detailTaskId);

    const openDetail = (task) => {
        if (task && task.id !== undefined && task.id !== null) {
            setDetailTaskId(task.id);
        }
    };

    const closeDetail = () => setDetailTaskId(null);

    // If the open detail task is deleted, findTaskById returns null and the
    // drawer hides itself; detailTaskId is cleared the next time a task is opened.

    const onPopupClose = async (taskID = -1, taskName = '', dateChoice, projectChoice = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, taskOrder = 0, assignedTime = null, inProgress = false, timeTaken = 0, longTerm = false) => {
        const isEditing = taskID !== -1 && taskID !== "-1" && taskID !== null && taskID !== undefined;

        if (taskName.trim() !== '') {
            if (isEditing) {
                // Update in place so the task keeps its ID. History, subtasks and
                // push chains all depend on a stable identity.
                try {
                    await updateTaskFields(taskID, {
                        taskName,
                        taskDate: dateChoice,
                        category: projectChoice,
                        priority: String(priority),
                        repeatType,
                        repeatDuration: String(repeatDuration),
                        dayOrder: String(taskOrder),
                        assignedTime: assignedTime || "null",
                    });
                    await taskManagement.fetchTasks();
                } catch (err) {
                    console.error('updateTaskFields backend failed:', err);
                    return;
                }
            } else {
                let task;
                try {
                    task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration, longTerm);
                } catch (err) {
                    console.error('addTask backend failed:', err);
                    return;
                }

                if (assignedTime) {
                    task.assignedTime = assignedTime;
                    await taskManagement.updateBackend(task.id, "assignedTime", assignedTime);
                }

                if (inProgress) {
                    task.inProgress = true;
                    await taskManagement.updateBackend(task.id, "inProgress", true);
                    startInProgressSession(task.id);
                }

                if (timeTaken > 0) {
                    task.timeTaken = timeTaken;
                    await taskManagement.updateBackend(task.id, "timeTaken", timeTaken);
                }

                taskManagement.addToFrontend(task);
            }
        }
        setPopupDate("");
        setPopupTaskItem(null);
        setShowPopup(false);
    };

    // Delete all incomplete tasks with the given category
    const deleteTasksByCategory = async (category) => {
        // Get all incomplete tasks across taskDays and overdueTasks
        const tasksToDelete = [];

        // From taskDays (future/today tasks)
        for (const date in taskManagement.taskDays) {
            const tasks = taskManagement.taskDays[date];
            tasks.forEach(task => {
                if (task.category === category && !task.complete) {
                    tasksToDelete.push({ id: task.id, date });
                }
            });
        }

        // From overdueTasks
        (taskManagement.overdueTasks.overdue || []).forEach(task => {
            if (task.category === category && !task.complete) {
                tasksToDelete.push({ id: task.id, date: task.taskDate });
            }
        });

        // Delete each task
        for (const { id, date } of tasksToDelete) {
            await taskManagement.removeTask(id, date);
        }
    };

    // Clear category for all incomplete tasks with the given category (set to "None")
    const clearCategoryForTasks = async (category) => {
        // From taskDays (future/today tasks)
        for (const date in taskManagement.taskDays) {
            const tasks = taskManagement.taskDays[date];
            for (const task of tasks) {
                if (task.category === category && !task.complete) {
                    await taskManagement.updateTask(task.id, "category", "None", date);
                }
            }
        }

        // From overdueTasks
        for (const task of (taskManagement.overdueTasks.overdue || [])) {
            if (task.category === category && !task.complete) {
                await taskManagement.updateTask(task.id, "category", "None", task.taskDate);
            }
        }
    };

    const updateTaskWithDeletedProjectCheck = async (id, field, value, date) => {
        // Normal update (complete=true also clears inProgress inside updateTask)
        await taskManagement.updateTask(id, field, value, date);
    };

    const handleDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) {
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Determine destination date
        let destDate;
        if (destination.droppableId === "tasks__list100") {
            // Dragging to overdue is not currently supported/handled for reordering
            return;
        } else {
            // Safer parsing for droppableId like "tasks__list10"
            const destIndex = parseInt(destination.droppableId.replace('tasks__list', ''), 10);
            destDate = taskManagement.startDate.add(destIndex, 'day').format('YYYY-MM-DD');
        }

        // Determine predecessor task ID
        // CRITICAL FIX: We need to map the filtered view's destination index to the unfiltered list
        // The drag-and-drop library gives us indexes based on the FILTERED view,
        // but moveTask operates on the UNFILTERED taskDays list.

        // Map to unfiltered list properly when filters are active
        const filteredDestTasks = filteredTaskDays[destDate] || [];
        const unfilteredDestTasks = taskManagement.taskDays[destDate] || [];

        // Use utility function to calculate predecessor
        const predecessorTaskId = calculatePredecessorUnfiltered(
            destination, source, filteredDestTasks, unfilteredDestTasks
        );

        taskManagement.moveTask(draggableId, destDate, predecessorTaskId);
    };

    return (
        <TaskContext.Provider value={{
            ...taskManagement,
            updateTask: updateTaskWithDeletedProjectCheck, // Override with edge case handling
            taskDays: filteredTaskDays,
            completedTasks: filteredCompletedTasks,
            overdueTasks: filteredOverdueTasks,
            showPopup,
            setShowPopup,
            popupDate,
            setPopupDate,
            popupTaskItem,
            setPopupTaskItem,
            callPopup,
            onPopupClose,
            detailTask,
            openDetail,
            closeDetail,
            subtaskCounts,
            refreshSubtaskCounts,
            darkMode,
            selectedProjects,
            toggleProject,
            deleteTasksByCategory,
            clearCategoryForTasks,
            handleDragEnd // Override the one from taskManagement
        }}>
            {children}
        </TaskContext.Provider>
    );
};
