import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { getTasks, updateField, deleteTask, addTask } from '../service';
import {
    addPendingChange,
    removePendingChange,
    applyPendingChanges,
    saveTaskSnapshot,
    loadTaskSnapshot
} from '../lib/pendingChanges';

const useTaskManagement = () => {
    const [taskDays, setTaskDays] = useState([]);
    const [completedTasks, setCompletedTasks] = useState({});
    const [overdueTasks, setOverdueTasks] = useState({ overdue: [] });
    const [startDate, setStartDate] = useState(() => dayjs().startOf('day'));
    const [completedDate, setCompletedDate] = useState(dayjs().subtract(7, 'day'));

    // Fix for SSR/hydration mismatch: ensure startDate is set to client's today on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setStartDate(dayjs().startOf('day'));
        }, 0);
        return () => clearTimeout(timer);
    }, []);


    // Helper to sort tasks by date then dayOrder
    const sortTasks = useCallback((tasks) => {
        return [...tasks].sort((a, b) => {
            if (a.taskDate !== b.taskDate) {
                return a.taskDate.localeCompare(b.taskDate);
            }
            return a.dayOrder - b.dayOrder;
        });
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            const response = await getTasks("bydate");
            // Handle case where response or itemsByDate might be undefined
            if (!response || !response.itemsByDate) {
                console.warn("Invalid response structure from getTasks");
                return;
            }

            const today = dayjs().format("YYYY-MM-DD")

            const newCompletedTasks = {};
            const newOverdueTasks = { overdue: [] };
            const newTaskDays = {};
            for (const date in response.itemsByDate) {
                const tasks = response.itemsByDate[date];
                if (date < today) {
                    // If date has passed
                    tasks.forEach(task => {
                        if (task.complete) {
                            if (!newCompletedTasks[date]) {
                                newCompletedTasks[date] = [];
                            }
                            newCompletedTasks[date].push(task);
                        } else {
                            newOverdueTasks.overdue.push(task);
                        }
                    });
                }
                else {
                    tasks.forEach(task => {
                        // Add to completedTasks if complete
                        if (task.complete) {
                            if (!newCompletedTasks[date]) {
                                newCompletedTasks[date] = [];
                            }
                            newCompletedTasks[date].push(task);
                        }
                        // Always add to taskDays so completed tasks remain visible in Upcoming/Today views
                        if (!newTaskDays[date]) {
                            newTaskDays[date] = [];
                        }
                        newTaskDays[date].push(task);
                    });
                }
            }
            setCompletedTasks(newCompletedTasks);
            newOverdueTasks.overdue = sortTasks(newOverdueTasks.overdue);

            // Sort each date's tasks by dayOrder before applying pending changes
            for (const date in newTaskDays) {
                newTaskDays[date].sort((a, b) => a.dayOrder - b.dayOrder);
            }

            // Apply any pending changes that haven't synced yet
            const { taskDays: mergedTaskDays, overdueTasks: mergedOverdue } =
                applyPendingChanges(newTaskDays, newOverdueTasks);

            setOverdueTasks(mergedOverdue);
            setTaskDays(mergedTaskDays);

            // Save confirmed state snapshot so next refresh starts here
            saveTaskSnapshot({
                taskDays: mergedTaskDays,
                overdueTasks: mergedOverdue,
                completedTasks: newCompletedTasks,
            });
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, [sortTasks]);

    useEffect(() => {
        // Immediately load snapshot from localStorage (cache-first)
        const snapshot = loadTaskSnapshot();
        if (snapshot) {
            setTaskDays(snapshot.taskDays || {});
            setOverdueTasks(snapshot.overdueTasks || { overdue: [] });
            setCompletedTasks(snapshot.completedTasks || {});
        }

        const timer = setTimeout(() => fetchTasks(), 0);
        return () => clearTimeout(timer);
    }, [fetchTasks]);

    const addToFrontend = (task) => {
        // Handle case where task is undefined or missing taskDate
        if (!task || !task.taskDate) {
            console.warn("Invalid task object in addToFrontend:", task);
            return;
        }

        if (task.taskDate < dayjs().format("YYYY-MM-DD")) {
            const updatedOverdue = sortTasks([...(overdueTasks.overdue || []), task]);
            setOverdueTasks(prevTaskDays => ({
                ...prevTaskDays,
                overdue: updatedOverdue
            }));

            saveTaskSnapshot({
                taskDays,
                overdueTasks: { overdue: updatedOverdue },
                completedTasks
            });
        }
        else {
            const updatedTaskDaysForDate = [
                ...(taskDays[task.taskDate] || []),
                task
            ].sort((a, b) => a.dayOrder - b.dayOrder);

            setTaskDays(prevTaskDays => ({
                ...prevTaskDays,
                [task.taskDate]: updatedTaskDaysForDate
            }));

            saveTaskSnapshot({
                taskDays: {
                    ...taskDays,
                    [task.taskDate]: updatedTaskDaysForDate
                },
                overdueTasks,
                completedTasks
            });
        }
    }

    const updateTask = (id, field, value, date) => {
        const today = dayjs().format("YYYY-MM-DD");
        const isOverdue = date < today;

        // 1. Save pending change to localStorage FIRST (before any updates)
        // This ensures the change persists even if page is refreshed before backend sync
        const pendingId = addPendingChange({
            type: 'UPDATE_FIELD',
            taskId: id,
            field: field,
            value: value,
            date: date
        });

        // 2. Update UI immediately (optimistic update)
        if (field === "complete") {
            if (value === true) {
                // Task is being marked as complete
                if (isOverdue) {
                    const updatedOverdue = { ...overdueTasks };
                    updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                        task.id === id ? { ...task, complete: true } : task
                    );
                    updatedOverdue.overdue = sortTasks(updatedOverdue.overdue);
                    setOverdueTasks(updatedOverdue);
                } else {
                    const updatedTaskDays = { ...taskDays };
                    if (updatedTaskDays[date]) {
                        updatedTaskDays[date] = updatedTaskDays[date].map(task =>
                            task.id === id ? { ...task, complete: true } : task
                        );
                        setTaskDays(updatedTaskDays);
                    }
                }

                // ALSO add to completedTasks so it appears in Completed section
                // Find the task to get its full data
                let taskToComplete = null;
                if (isOverdue) {
                    taskToComplete = overdueTasks.overdue.find(t => t.id === id);
                } else if (taskDays[date]) {
                    taskToComplete = taskDays[date].find(t => t.id === id);
                }

                if (taskToComplete) {
                    const updatedCompletedTasks = { ...completedTasks };
                    if (!updatedCompletedTasks[date]) {
                        updatedCompletedTasks[date] = [];
                    }
                    updatedCompletedTasks[date].push({ ...taskToComplete, complete: true });
                    setCompletedTasks(updatedCompletedTasks);
                }
            } else {
                // Task is being unmarked (uncompleted)
                if (isOverdue) {
                    const updatedOverdue = { ...overdueTasks };
                    updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                        task.id === id ? { ...task, complete: false } : task
                    );
                    updatedOverdue.overdue = sortTasks(updatedOverdue.overdue);
                    setOverdueTasks(updatedOverdue);
                } else {
                    const updatedTaskDays = { ...taskDays };
                    if (updatedTaskDays[date]) {
                        updatedTaskDays[date] = updatedTaskDays[date].map(task =>
                            task.id === id ? { ...task, complete: false } : task
                        );
                        setTaskDays(updatedTaskDays);
                    }
                }

                // Remove from completedTasks
                const updatedCompletedTasks = { ...completedTasks };
                if (updatedCompletedTasks[date]) {
                    updatedCompletedTasks[date] = updatedCompletedTasks[date].filter(task => task.id !== id);
                    setCompletedTasks(updatedCompletedTasks);
                }
            }
        } else {
            // For non-complete field updates, just update the task in place
            if (isOverdue) {
                const updatedOverdue = { ...overdueTasks };
                updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                    task.id === id ? { ...task, [field]: value } : task
                );
                updatedOverdue.overdue = sortTasks(updatedOverdue.overdue);
                setOverdueTasks(updatedOverdue);
            }

            // Also update taskDays if it exists there
            const updatedTaskDays = { ...taskDays };
            if (updatedTaskDays[date]) {
                updatedTaskDays[date] = updatedTaskDays[date].map((task) =>
                    task.id === id ? { ...task, [field]: value } : task
                );
                setTaskDays(updatedTaskDays);
            }
        }

        // Save snapshot with latest state derived from current updates
        // Since React state updates are async, we recalculate inline for snapshotting
        let snapTaskDays = { ...taskDays };
        let snapOverdue = { ...overdueTasks };
        let snapCompleted = { ...completedTasks };

        if (field === "complete") {
            if (value === true) {
                if (isOverdue) snapOverdue.overdue = snapOverdue.overdue.map(t => t.id === id ? { ...t, complete: true } : t);
                else if (snapTaskDays[date]) snapTaskDays[date] = snapTaskDays[date].map(t => t.id === id ? { ...t, complete: true } : t);

                let taskToComplete = isOverdue ? overdueTasks.overdue.find(t => t.id === id) : (taskDays[date] && taskDays[date].find(t => t.id === id));
                if (taskToComplete) {
                    if (!snapCompleted[date]) snapCompleted[date] = [];
                    // Avoid duplicates
                    if (!snapCompleted[date].find(t => t.id === id)) {
                        snapCompleted[date].push({ ...taskToComplete, complete: true });
                    }
                }
            } else {
                if (isOverdue) snapOverdue.overdue = snapOverdue.overdue.map(t => t.id === id ? { ...t, complete: false } : t);
                else if (snapTaskDays[date]) snapTaskDays[date] = snapTaskDays[date].map(t => t.id === id ? { ...t, complete: false } : t);

                if (snapCompleted[date]) snapCompleted[date] = snapCompleted[date].filter(t => t.id !== id);
            }
            if (isOverdue) snapOverdue.overdue = sortTasks(snapOverdue.overdue);
        } else {
            if (isOverdue) {
                snapOverdue.overdue = snapOverdue.overdue.map(t => t.id === id ? { ...t, [field]: value } : t);
                snapOverdue.overdue = sortTasks(snapOverdue.overdue);
            }
            if (snapTaskDays[date]) snapTaskDays[date] = snapTaskDays[date].map(t => t.id === id ? { ...t, [field]: value } : t);
        }

        saveTaskSnapshot({ taskDays: snapTaskDays, overdueTasks: snapOverdue, completedTasks: snapCompleted });

        // 3. Send to backend async (don't block UI)
        updateField(id, field, value)
            .then((taskItem) => {
                // 4. Remove pending change on success
                removePendingChange(pendingId);

                // Handle repeat tasks after backend confirms (for complete field)
                if (field === "complete" && value === true && taskItem && taskItem.repeatType !== "NONE") {
                    addNextRepeat(taskItem);
                }
            })
            .catch((error) => {
                // 5. Keep pending change on failure for replay on refresh
                console.error(`Error updating task with id ${id}:`, error);
                console.warn('Backend sync failed, keeping pending change for retry on next load');
            });
    };

    const updateBackend = async (id, field, value) => {
        try {
            await updateField(id, field, value);
        } catch (error) {
            console.error(`Error updating task with id ${id}:`, error);
        }
    }

    const addNextRepeat = async (task) => {
        const { taskDate, repeatType, repeatDuration } = task;
        let date = dayjs(taskDate);

        switch (repeatType) {
            case "EVERY_X_DAYS":
                date = date.add(repeatDuration, 'day');
                break;
            case "EVERY_X_WEEKS":
                date = date.add(repeatDuration, 'week');
                break;
            case "EVERY_X_MONTHS":
                date = date.add(repeatDuration, 'month');
                break;
            case "SPECIFIC_WEEKDAYS":
                const binaryString = repeatDuration.toString(2).padStart(7, '0');
                let nextDayFound = false;
                while (!nextDayFound) {
                    date = date.add(1, 'day');
                    const dayIndex = (date.day() + 6) % 7;
                    if (binaryString[dayIndex] === '1') {
                        nextDayFound = true;
                    }
                }
                break;
            default:
                break;
        }

        const newDate = date.format('YYYY-MM-DD');

        // Check if task already exists in the future date
        const existingTasks = taskDays[newDate] || [];
        const isDuplicate = existingTasks.some(t => {
            console.log("Checking duplicate:", {
                tName: t.name,
                taskName: task.name,
                tCat: t.category,
                taskCat: task.category,
                tId: t.id,
                taskId: task.id
            });
            return t.name === task.name &&
                t.category === task.category &&
                t.id !== task.id;
        });

        if (isDuplicate) {
            console.log("Recurring task already exists for date:", newDate);
            return;
        }

        task.taskDate = newDate;

        try {
            const newTask = await addTask(task.name, newDate, task.category, task.priority, repeatType, repeatDuration, task.longTerm);
            addToFrontend(newTask);
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const removeTask = async (taskId, date, update = false) => {
        // 1. Queue pending delete so that if backend fails, the task stays removed visually on refresh
        const pendingId = addPendingChange({
            type: 'DELETE_TASK',
            taskId: taskId.toString(),
            date: date,
        });

        try {
            const task_completed = await deleteTask(taskId);
            // 2. Backend confirmed — remove pending change
            removePendingChange(pendingId);

            if (task_completed) {
                const newCompletedTasks = { ...completedTasks };
                newCompletedTasks[date] = newCompletedTasks[date].filter((task) => task.id !== taskId);

                if (!update) {
                    newCompletedTasks[date].forEach((task, index) => {
                        task.dayOrder = index + 1;
                        updateBackend(task.id, "dayOrder", index + 1);
                    });
                }
                setCompletedTasks(newCompletedTasks);
            }
            else {
                if (date < dayjs().format("YYYY-MM-DD")) {
                    const updatedOverdue = { ...overdueTasks };
                    updatedOverdue.overdue = updatedOverdue.overdue.filter((task) => task.id !== taskId);
                    setOverdueTasks(updatedOverdue);
                }
                else {
                    const updatedTaskDays = { ...taskDays };
                    updatedTaskDays[date] = updatedTaskDays[date].filter((task) => task.id !== taskId);
                    if (!update) {
                        updatedTaskDays[date].forEach((task, index) => {
                            task.dayOrder = index + 1;
                            updateBackend(task.id, "dayOrder", index + 1);
                        });
                    }
                    setTaskDays(updatedTaskDays);

                    saveTaskSnapshot({
                        taskDays: updatedTaskDays,
                        overdueTasks,
                        completedTasks: completedTasks
                    });
                }
            }
        } catch (error) {
            // 3. Keep pending change so task stays removed on next load
            console.error(`Error deleting task with id ${taskId}:`, error);
        }
    };

    const moveTask = (taskId, destDate, predecessorTaskId = null) => {
        // Find source task
        let sourceTask = null;
        let sourceDate = null;
        let isOverdue = false;

        // Check overdue first
        const overdueIndex = overdueTasks.overdue.findIndex(t => t.id.toString() === taskId);
        if (overdueIndex !== -1) {
            sourceTask = overdueTasks.overdue[overdueIndex];
            isOverdue = true;
        } else {
            // Check taskDays
            for (const date in taskDays) {
                const index = taskDays[date].findIndex(t => t.id.toString() === taskId);
                if (index !== -1) {
                    sourceTask = taskDays[date][index];
                    sourceDate = date;
                    break;
                }
            }
        }

        if (!sourceTask) {
            console.error("Source task not found:", taskId);
            return;
        }

        // Add to pending changes queue BEFORE making any updates
        // This ensures the change persists even if page is refreshed before backend sync
        const pendingId = addPendingChange({
            type: 'MOVE_TASK',
            taskId: taskId,
            sourceDate: isOverdue ? 'overdue' : sourceDate,
            destDate: destDate,
            predecessorTaskId: predecessorTaskId,
            taskData: { ...sourceTask, taskDate: destDate }
        });

        // Calculate the new destination list for both frontend and backend
        // This ensures we use the same logic and avoid stale state issues
        let currentDestList = [...(taskDays[destDate] || [])].sort((a, b) => a.dayOrder - b.dayOrder);

        // Remove source task if it's in the destination date
        if (!isOverdue && sourceDate === destDate) {
            currentDestList = currentDestList.filter(t => t.id.toString() !== taskId);
        }

        // Find insert position based on predecessor
        let insertIndex = 0;
        if (predecessorTaskId) {
            const predIndex = currentDestList.findIndex(t => t.id.toString() === predecessorTaskId);
            if (predIndex !== -1) {
                insertIndex = predIndex + 1;
            }
        }

        // Create the task to move with updated date
        const taskToMove = { ...sourceTask, taskDate: destDate };

        // Insert at the correct position
        currentDestList.splice(insertIndex, 0, taskToMove);

        // Calculate new dayOrder values
        const updatedDestList = currentDestList.map((t, i) => ({
            ...t,
            dayOrder: i + 1
        }));

        // 1. Remove from source (if overdue)
        if (isOverdue) {
            const updatedOverdue = { ...overdueTasks };
            updatedOverdue.overdue = updatedOverdue.overdue.filter(t => t.id.toString() !== taskId);
            setOverdueTasks(updatedOverdue);
        }

        // 2. Update destination with the calculated list
        setTaskDays(prevTaskDays => {
            const newTaskDays = { ...prevTaskDays };

            // Remove from source if it was in taskDays
            if (!isOverdue && sourceDate) {
                newTaskDays[sourceDate] = (newTaskDays[sourceDate] || []).filter(t => t.id.toString() !== taskId);
            }

            // Set the new destination list
            newTaskDays[destDate] = updatedDestList;

            // Save snapshot with latest state
            saveTaskSnapshot({
                taskDays: newTaskDays,
                overdueTasks: isOverdue ? { ...overdueTasks, overdue: overdueTasks.overdue.filter(t => t.id.toString() !== taskId) } : overdueTasks,
                completedTasks: completedTasks
            });

            return newTaskDays;
        });

        // 3. Update Backend and remove pending change on success
        // Track all backend updates so we can remove pending change when all complete
        const backendPromises = [];

        backendPromises.push(
            updateField(taskId, "taskDate", destDate)
                .catch(err => {
                    console.error(`Error updating taskDate for ${taskId}:`, err);
                    throw err;
                })
        );

        // Update dayOrder for all tasks in the destination using the same calculated values
        updatedDestList.forEach((t, i) => {
            backendPromises.push(
                updateField(t.id, "dayOrder", i + 1)
                    .catch(err => {
                        console.error(`Error updating dayOrder for ${t.id}:`, err);
                        throw err;
                    })
            );
        });

        // Remove pending change only when all backend updates succeed
        Promise.all(backendPromises)
            .then(() => {
                removePendingChange(pendingId);
            })
            .catch(() => {
                // Keep pending change in queue for replay on next load
                console.warn('Backend sync failed, keeping pending change for retry');
            });
    };

    return {
        taskDays,
        setTaskDays,
        completedTasks,
        setCompletedTasks,
        overdueTasks,
        setOverdueTasks,
        startDate,
        setStartDate,
        completedDate,
        setCompletedDate,
        fetchTasks,
        addToFrontend,
        updateTask,
        removeTask,
        moveTask,
        updateBackend,
        addNextRepeat
    };
};

export default useTaskManagement;
