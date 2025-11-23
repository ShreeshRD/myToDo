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
        const tasks = taskManagement.taskDays[date].filter(isTaskVisible);
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

    const onPopupClose = async (deleteid = -1, taskDate, taskName = '', dateChoice, projectChoice = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, taskOrder = 0) => {
        if (taskName.trim() !== '') {
            let task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration);
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
            toggleProject
        }}>
            {children}
        </TaskContext.Provider>
    );
};
