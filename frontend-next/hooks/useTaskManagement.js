import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getTasks, updateField, deleteTask, addTask } from '../service';

const useTaskManagement = () => {
    const [taskDays, setTaskDays] = useState([]);
    const [completedTasks, setCompletedTasks] = useState({});
    const [overdueTasks, setOverdueTasks] = useState({ overdue: [] });
    const [startDate, setStartDate] = useState(dayjs());
    const [completedDate, setCompletedDate] = useState(dayjs().subtract(7, 'day'));

    useEffect(() => {
        const fetch = async () => {
            await fetchTasks();
        }
        fetch();
    }, []);

    const fetchTasks = async () => {
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
                        if (task.complete) {
                            if (!newCompletedTasks[date]) {
                                newCompletedTasks[date] = [];
                            }
                            newCompletedTasks[date].push(task);
                        }
                        else {
                            if (!newTaskDays[date]) {
                                newTaskDays[date] = [];
                            }
                            newTaskDays[date].push(task);
                        }
                    });
                }
            }
            setCompletedTasks(newCompletedTasks);
            setOverdueTasks(newOverdueTasks);
            setTaskDays(newTaskDays);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    const addToFrontend = (task) => {
        // Handle case where task is undefined or missing taskDate
        if (!task || !task.taskDate) {
            console.warn("Invalid task object in addToFrontend:", task);
            return;
        }
        
        if (task.taskDate < dayjs().format("YYYY-MM-DD")) {
            setOverdueTasks(prevTaskDays => ({
                ...prevTaskDays,
                overdue: [...(prevTaskDays.overdue || []), task]
            }));
        }
        else {
            setTaskDays(prevTaskDays => ({
                ...prevTaskDays,
                [task.taskDate]: [
                    ...(prevTaskDays[task.taskDate] || []),
                    task
                ]
            }));
        }
    }

    const updateTask = async (id, field, value, date) => {
        try {
            const taskItem = await updateField(id, field, value);
            
            if (field === "complete") {
                const today = dayjs().format("YYYY-MM-DD");
                const isOverdue = date < today;
                
                if (value === true) {
                    // Task is being marked as complete
                    // Update the task in place to show strikethrough
                    if (isOverdue) {
                        const updatedOverdue = { ...overdueTasks };
                        updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                            task.id === id ? { ...task, complete: true } : task
                        );
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
                    const updatedCompletedTasks = { ...completedTasks };
                    if (!updatedCompletedTasks[date]) {
                        updatedCompletedTasks[date] = [];
                    }
                    updatedCompletedTasks[date].push({ ...taskItem, complete: true });
                    console.log('Adding task to completedTasks:', date, taskItem);
                    console.log('Updated completedTasks:', updatedCompletedTasks);
                    setCompletedTasks(updatedCompletedTasks);
                    
                    // Handle repeat tasks
                    if (taskItem.repeatType !== "NONE") {
                        addNextRepeat(taskItem);
                    }
                } else {
                    // Task is being unmarked (uncompleted)
                    // Update in place
                    if (isOverdue) {
                        const updatedOverdue = { ...overdueTasks };
                        updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                            task.id === id ? { ...task, complete: false } : task
                        );
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
                const updatedTaskDays = { ...taskDays };
                if (updatedTaskDays[date]) {
                    updatedTaskDays[date] = updatedTaskDays[date].map((task) =>
                        task.id === id ? { ...task, [field]: value } : task
                    );
                    setTaskDays(updatedTaskDays);
                }
            }
        } catch (error) {
            console.error(`Error updating task with id ${id}:`, error);
        }
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
        task.taskDate = newDate;

        try {
            const newTask = await addTask(task.name, newDate, task.category, task.priority, repeatType, repeatDuration);
            addToFrontend(newTask);
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const removeTask = async (taskId, date, update = false) => {
        try {
            const task_completed = await deleteTask(taskId);
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
                }
            }
        } catch (error) {
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

        // 1. Remove from source
        if (isOverdue) {
            const updatedOverdue = { ...overdueTasks };
            updatedOverdue.overdue = updatedOverdue.overdue.filter(t => t.id.toString() !== taskId);
            setOverdueTasks(updatedOverdue);
        } else {
            const updatedTaskDays = { ...taskDays };
            updatedTaskDays[sourceDate] = updatedTaskDays[sourceDate].filter(t => t.id.toString() !== taskId);
            setTaskDays(updatedTaskDays);
        }

        // 2. Add to destination
        // We need to fetch the latest state for destination because we might have just updated it if source == dest date
        // Actually, React state updates are async, so we should calculate everything on the "current" state 
        // but we need to be careful not to lose the removal if we update taskDays twice.
        // BETTER: Calculate new state for both source and dest in one go if they are in taskDays.

        setTaskDays(prevTaskDays => {
            const newTaskDays = { ...prevTaskDays };
            
            // If source was in taskDays, remove it first (using the fresh state)
            if (!isOverdue && sourceDate) {
                newTaskDays[sourceDate] = (newTaskDays[sourceDate] || []).filter(t => t.id.toString() !== taskId);
            }

            // Now insert into destination
            // Sort by dayOrder to ensure we insert at the correct visual position
            newTaskDays[destDate] = [...(newTaskDays[destDate] || [])].sort((a, b) => a.dayOrder - b.dayOrder);
            const destList = newTaskDays[destDate];
            
            // Update task date
            const taskToMove = { ...sourceTask, taskDate: destDate };

            let insertIndex = 0;
            if (predecessorTaskId) {
                const predIndex = destList.findIndex(t => t.id.toString() === predecessorTaskId);
                if (predIndex !== -1) {
                    insertIndex = predIndex + 1;
                }
            }
            
            destList.splice(insertIndex, 0, taskToMove);
            
            // Update dayOrder
            destList.forEach((t, i) => {
                t.dayOrder = i + 1;
            });

            return newTaskDays;
        });

        // If source was overdue, we already called setOverdueTasks, which is fine as it's separate state.
        
        // 3. Update Backend
        updateBackend(taskId, "taskDate", destDate);
        // We need to update dayOrder for all tasks in destination. 
        // We can't easily get the *new* list here to send to backend because of async state.
        // But we can reconstruct it or wait. 
        // Actually, we can just do the same logic locally to know the order.
        
        // Let's reconstruct the dest list to update backend
        // We take the *current* dest list (minus source if it was there) and insert.
        let currentDestList = taskDays[destDate] || [];
        if (!isOverdue && sourceDate === destDate) {
             currentDestList = currentDestList.filter(t => t.id.toString() !== taskId);
        }
        // If source was different date, currentDestList is fine as is.
        
        const newDestList = [...currentDestList];
        let backendInsertIndex = 0;
        if (predecessorTaskId) {
             const predIndex = newDestList.findIndex(t => t.id.toString() === predecessorTaskId);
             if (predIndex !== -1) {
                 backendInsertIndex = predIndex + 1;
             }
        }
        // We don't strictly need to add the task object to newDestList to update orders, 
        // but we need to know which IDs are where.
        // Actually, we should just update the moved task's order and the others.
        
        // Wait, `updateBackend` is async.
        // Let's just iterate the new order we calculated.
        // We can grab the list from the setTaskDays updater? No.
        
        // Let's just re-calculate locally for backend update.
        // CRITICAL: Sort by dayOrder so that the re-indexing matches the visual order
        const backendDestList = [...(taskDays[destDate] || [])].sort((a, b) => a.dayOrder - b.dayOrder);
        // Remove if source same date
        let filteredBackendDestList = backendDestList;
        if (!isOverdue && sourceDate === destDate) {
            filteredBackendDestList = backendDestList.filter(t => t.id.toString() !== taskId);
        }
        
        filteredBackendDestList.splice(backendInsertIndex, 0, { ...sourceTask, taskDate: destDate });
        
        filteredBackendDestList.forEach((t, i) => {
             updateBackend(t.id, "dayOrder", i + 1);
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
