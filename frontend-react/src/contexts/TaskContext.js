import React, { createContext, useContext, useState } from 'react';
import useTaskManagement from '../hooks/useTaskManagement';
import { addTask } from "../service";
import useUIState from '../hooks/useUIState';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const taskManagement = useTaskManagement();
    const { darkMode } = useUIState();
    const [showPopup, setShowPopup] = useState(false);
    const [popupDate, setPopupDate] = useState("");
    const [popupTaskItem, setPopupTaskItem] = useState(null);

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
            showPopup,
            setShowPopup,
            popupDate,
            setPopupDate,
            popupTaskItem,
            setPopupTaskItem,
            callPopup,
            onPopupClose,
            darkMode
        }}>
            {children}
        </TaskContext.Provider>
    );
};
