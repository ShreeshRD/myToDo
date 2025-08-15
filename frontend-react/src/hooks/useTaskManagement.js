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
            const updatedTaskDays = { ...taskDays };
            if (field === "complete" && date < dayjs().format("YYYY-MM-DD")) {
                const updatedOverdue = { ...overdueTasks };
                // Change the date
                date = dayjs().format("YYYY-MM-DD");
                await updateField(id, "taskDate", date);
                taskItem.taskDate = date;
                const existingTasks = updatedTaskDays[date] || [];
                taskItem.dayOrder = existingTasks.length + 1;
                updatedTaskDays[date] = [...existingTasks, taskItem];
                // Remove from overdue list
                const finalOverdue = { ...updatedOverdue };
                finalOverdue.overdue = finalOverdue.overdue.filter(task => task.id !== id);
                setOverdueTasks(finalOverdue);
            }
            if (field === "complete" && value && taskItem.repeatType !== "NONE") {
                addNextRepeat(taskItem);
            }
            updatedTaskDays[date] = updatedTaskDays[date].map((task) =>
                task.id === id ? { ...task, [field]: value } : task
            );
            setTaskDays(updatedTaskDays);
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

    const handleDragEnd = (result) => {
        if (!result.destination || result.destination.droppableId === "tasks__list100") {
            return;
        }
        else if (result.source.droppableId === "tasks__list100") {
            // If source item is from overdue list
            const destChar = result.destination.droppableId.charAt(result.destination.droppableId.length - 1);
            const destDate = startDate.add(parseInt(destChar, 10), 'day').format('YYYY-MM-DD');

            const updatedTaskDays = { ...taskDays };
            updatedTaskDays[destDate] ??= [];
            const newTasks = updatedTaskDays[destDate];
            const [removed] = overdueTasks.overdue.splice(result.source.index, 1);
            removed.taskDate = destDate;
            newTasks.splice(result.destination.index, 0, removed);
            newTasks.forEach((task, index) => {
                task.dayOrder = index + 1;
            });
            setTaskDays(updatedTaskDays);
            // Update backend
            updateBackend(removed.id, "taskDate", destDate);
            newTasks.forEach((task, index) => {
                updateBackend(task.id, "dayOrder", index + 1);
            });
        }
        else if (result.source.droppableId === result.destination.droppableId && result.source.index !== result.destination.index) {
            const lastChar = result.source.droppableId.charAt(result.source.droppableId.length - 1);
            const date = startDate.add(parseInt(lastChar, 10), 'day').format('YYYY-MM-DD');

            const updatedTaskDays = { ...taskDays };
            const newTasks = updatedTaskDays[date];
            const [removed] = newTasks.splice(result.source.index, 1);
            newTasks.splice(result.destination.index, 0, removed);
            newTasks.forEach((task, index) => {
                task.dayOrder = index + 1;
            });
            setTaskDays(updatedTaskDays);
            // Update backend
            newTasks.forEach((task, index) => {
                updateBackend(task.id, "dayOrder", index + 1);
            });
        }
        else if (result.source.droppableId !== result.destination.droppableId) {
            const sourceChar = result.source.droppableId.charAt(result.source.droppableId.length - 1);
            const sourceDate = startDate.add(parseInt(sourceChar, 10), 'day').format('YYYY-MM-DD');
            const destChar = result.destination.droppableId.charAt(result.destination.droppableId.length - 1);
            const destDate = startDate.add(parseInt(destChar, 10), 'day').format('YYYY-MM-DD');

            const updatedTaskDays = { ...taskDays };
            const sourceTasks = updatedTaskDays[sourceDate];
            const [removed] = sourceTasks.splice(result.source.index, 1);
            removed.taskDate = destDate;
            updatedTaskDays[destDate] ??= [];
            const destTasks = updatedTaskDays[destDate];
            destTasks.splice(result.destination.index, 0, removed);
            sourceTasks.forEach((task, index) => {
                task.dayOrder = index + 1;
            });
            destTasks.forEach((task, index) => {
                task.dayOrder = index + 1;
            });
            setTaskDays(updatedTaskDays);
            // Update backend
            updateBackend(removed.id, "taskDate", destDate);
            sourceTasks.forEach((task, index) => {
                updateBackend(task.id, "dayOrder", index + 1);
            });
            destTasks.forEach((task, index) => {
                updateBackend(task.id, "dayOrder", index + 1);
            });
        }
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
        handleDragEnd,
        updateBackend,
        addNextRepeat
    };
};

export default useTaskManagement;
