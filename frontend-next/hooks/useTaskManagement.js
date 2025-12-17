import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getTasks, updateField, deleteTask, addTask } from '../service';

const useTaskManagement = () => {
    const [taskDays, setTaskDays] = useState([]);
    const [completedTasks, setCompletedTasks] = useState({});
    const [overdueTasks, setOverdueTasks] = useState({ overdue: [] });
    const [startDate, setStartDate] = useState(() => dayjs().startOf('day'));
    const [completedDate, setCompletedDate] = useState(dayjs().subtract(7, 'day'));

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
            setOverdueTasks(newOverdueTasks);
            setTaskDays(newTaskDays);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect(() => {
        const fetch = async () => {
            await fetchTasks();
        }
        fetch();
    }, []);

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
                    // Update the task in place with data from backend (includes assignedTime)
                    if (isOverdue) {
                        const updatedOverdue = { ...overdueTasks };
                        updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                            task.id === id ? { ...task, ...taskItem } : task
                        );
                        setOverdueTasks(updatedOverdue);
                    } else {
                        const updatedTaskDays = { ...taskDays };
                        if (updatedTaskDays[date]) {
                            updatedTaskDays[date] = updatedTaskDays[date].map(task =>
                                task.id === id ? { ...task, ...taskItem } : task
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
                const today = dayjs().format("YYYY-MM-DD");
                const isOverdue = date < today;

                if (isOverdue) {
                    const updatedOverdue = { ...overdueTasks };
                    updatedOverdue.overdue = updatedOverdue.overdue.map(task =>
                        task.id === id ? { ...task, [field]: value } : task
                    );
                    setOverdueTasks(updatedOverdue);
                }

                // Also update taskDays if it exists there (e.g. for future tasks or if logic changes)
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

        // Check if task already exists in the future date
        const existingTasks = taskDays[newDate] || [];
        const isDuplicate = existingTasks.some(t =>
            t.name === task.name &&
            t.category === task.category
        );

        if (isDuplicate) {
            console.log("Recurring task already exists for date:", newDate);
            return;
        }

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

            return newTaskDays;
        });

        // 3. Update Backend using the same calculated list
        updateBackend(taskId, "taskDate", destDate);

        // Update dayOrder for all tasks in the destination using the same calculated values
        updatedDestList.forEach((t, i) => {
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
