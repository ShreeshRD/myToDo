'use client'

import React, { useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTasks } from "../contexts/TaskContext";
import dayjs from 'dayjs';
import TaskDetailPanel from "./TaskDetailPanel";

function Completed() {
    const { completedTasks: taskDays, darkMode, completedDate, updateTask } = useTasks();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [panelDate, setPanelDate] = useState(null);

    const onDateChange = (date) => {
        setSelectedDate(date);
    };

    const handleDayClick = (value) => {
        if (panelDate && dayjs(value).isSame(dayjs(panelDate), 'day')) {
            setPanelDate(null);
        } else {
            setPanelDate(value);
        }
    };

    const handleUncheckTask = (task) => {
        updateTask(task.id, "complete", false, task.taskDate);
    };

    const closePanel = () => {
        setPanelDate(null);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateString = dayjs(date).format('YYYY-MM-DD');
            if (taskDays[dateString] && taskDays[dateString].length > 0) {
                const tasks = taskDays[dateString];
                const sortedTasks = tasks.sort((a, b) => a.dayOrder - b.dayOrder);
                return (
                    <div className="calendar-tasks">
                        {sortedTasks.map((task) => (
                            <div key={task.id} className="calendar-task-item completed">
                                {task.name}
                            </div>
                        ))}
                    </div>
                );
            }
        }
        return null;
    };

    const getPanelTasks = () => {
        if (!panelDate) return [];
        const dateString = dayjs(panelDate).format('YYYY-MM-DD');
        return taskDays[dateString] || [];
    };

    return (
        <div className={`calendar-view completed-calendar-view ${darkMode ? 'dark' : ''}`}>
            <div className="completed-view-container">
                <div className={`calendar-container ${panelDate ? 'shrink' : ''}`}>
                    <Calendar
                        onChange={onDateChange}
                        onClickDay={handleDayClick}
                        value={selectedDate}
                        activeStartDate={completedDate.toDate()}
                        showNavigation={false}
                        tileContent={tileContent}
                        className={darkMode ? 'react-calendar--theme-dark' : ''}
                    />
                </div>
                
                <TaskDetailPanel 
                    isOpen={!!panelDate}
                    onClose={closePanel}
                    tasks={getPanelTasks()}
                    onUncheckTask={handleUncheckTask}
                    date={panelDate}
                    darkMode={darkMode}
                />
            </div>
        </div>
    );
}

export default Completed;
