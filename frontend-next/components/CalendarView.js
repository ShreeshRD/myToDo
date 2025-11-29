'use client'

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTasks } from '../contexts/TaskContext';
import dayjs from 'dayjs';
import TaskDetailPanel from "./TaskDetailPanel";

function CalendarView() {
    const { taskDays, darkMode, updateTask } = useTasks();
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

    const closePanel = () => {
        setPanelDate(null);
    };

    const getPanelTasks = () => {
        if (!panelDate) return [];
        const dateString = dayjs(panelDate).format('YYYY-MM-DD');
        return taskDays[dateString] || [];
    };

    const handleToggleTask = (task) => {
        updateTask(task.id, "complete", !task.complete, task.taskDate);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateString = dayjs(date).format('YYYY-MM-DD');
            if (taskDays[dateString] && taskDays[dateString].length > 0) {
                const tasks = taskDays[dateString];
                const sortedTasks = tasks.sort((a, b) => a.dayOrder - b.dayOrder);
                return (
                    <div className="calendar-tasks">
                        {sortedTasks.map((task, index) => (
                            <div key={task.id} className={`calendar-task-item ${task.complete ? 'completed' : ''}`}>
                                {task.name}
                            </div>
                        ))}
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <div className={`calendar-view ${darkMode ? 'dark' : ''}`}>
            <div className="completed-view-container">
                <div className={`calendar-container ${panelDate ? 'shrink' : ''}`}>
                    <Calendar
                        onChange={onDateChange}
                        onClickDay={handleDayClick}
                        value={selectedDate}
                        tileContent={tileContent}
                        className={darkMode ? 'react-calendar--theme-dark' : ''}
                    />
                </div>

                <TaskDetailPanel 
                    isOpen={!!panelDate}
                    onClose={closePanel}
                    tasks={getPanelTasks()}
                    onToggleTask={handleToggleTask}
                    date={panelDate}
                    darkMode={darkMode}
                />
            </div>
        </div>
    );
}

export default CalendarView;
