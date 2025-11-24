'use client'

import React, { createContext, useContext, useState } from 'react';
import useTaskManagement from '../hooks/useTaskManagement';
import { addTask } from "../service";
import { useUI } from './UIContext';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const taskManagement = useTaskManagement();
    const { darkMode } = useUI();
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [popupDate, setPopupDate] = useState("");
    const [popupTaskItem, setPopupTaskItem] = useState(null);

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

    const onPopupClose = async (deleteid = -1, taskDate, taskName = '', dateChoice, projectChoice = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, taskOrder = 0, assignedTime = null) => {
        if (taskName.trim() !== '') {
            let task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration);
            
            if (assignedTime) {
                task.assignedTime = assignedTime;
                await taskManagement.updateBackend(task.id, "assignedTime", assignedTime);
            }

            if (deleteid !== -1) {
                await taskManagement.removeTask(deleteid, taskDate, true);
                task.dayOrder = taskOrder;
                taskManagement.updateBackend(task.id, "dayOrder", taskOrder);
            }
            taskManagement.addToFrontend(task);
        }
        setPopupDate("");
        setPopupTaskItem(null);
        setShowPopup(false);
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
            // Dragging to overdue? Usually not allowed or handled differently.
            // For now, let's assume we can't drag TO overdue from future.
            // If we can, we need logic. But based on previous code, droppableId for overdue is tasks__list100
            // And logic was `destChar`... wait.
            // Previous logic: `destChar = result.destination.droppableId.charAt(result.destination.droppableId.length - 1);`
            // If droppableId is "tasks__list100", charAt(length-1) is '0'. 
            // This seems like a bug in previous code or I misunderstood.
            // Let's check ToDoDay.js again. id={100} for overdue.
            // So droppableId is "tasks__list100".
            // If I drag to overdue, I should probably handle it.
            // But let's focus on dragging to dates.
            // If destination is overdue, let's skip for now or handle if needed.
            // The user bug is about dragging BETWEEN days.
            return; 
        } else {
             const destChar = destination.droppableId.charAt(destination.droppableId.length - 1);
             destDate = taskManagement.startDate.add(parseInt(destChar, 10), 'day').format('YYYY-MM-DD');
        }

        // Determine predecessor task ID
        // We look at the FILTERED list for the destination date.
        const destTasks = filteredTaskDays[destDate] || [];
        
        let predecessorTaskId = null;
        if (destination.index > 0) {
            // If we drop at index N, we want to be after the task at index N-1
            const predecessorTask = destTasks[destination.index - 1];
            if (predecessorTask) {
                predecessorTaskId = predecessorTask.id.toString();
            }
        }
        
        taskManagement.moveTask(draggableId, destDate, predecessorTaskId);
    };

    return (
        <TaskContext.Provider value={{
            ...taskManagement,
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
            darkMode,
            selectedProjects,
            toggleProject,
            handleDragEnd // Override the one from taskManagement
        }}>
            {children}
        </TaskContext.Provider>
    );
};
