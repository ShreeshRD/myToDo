'use client'

import React, { useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTasks } from "../contexts/TaskContext";
import dayjs from 'dayjs';

function Completed() {
    const { completedTasks: taskDays, darkMode, completedDate } = useTasks();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const onDateChange = (date) => {
        setSelectedDate(date);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateString = dayjs(date).format('YYYY-MM-DD');
            if (taskDays[dateString] && taskDays[dateString].length > 0) {
                const tasks = taskDays[dateString];
                const sortedTasks = tasks.sort((a, b) => a.dayOrder - b.dayOrder);
                return (
                    <div className="calendar-tasks">
                        {sortedTasks.slice(0, 3).map((task) => (
                            <div key={task.id} className={`calendar-task-item completed`}>
                                {task.name}
                            </div>
                        ))}
                        {sortedTasks.length > 3 && (
                            <div className="calendar-task-more">
                                +{sortedTasks.length - 3} more
                            </div>
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <div className={`calendar-view completed-calendar-view ${darkMode ? 'dark' : ''}`}>
            <div className="calendar-container">
                <Calendar
                    onChange={onDateChange}
                    value={selectedDate}
                    activeStartDate={completedDate.toDate()}
                    showNavigation={false}
                    tileContent={tileContent}
                    className={darkMode ? 'react-calendar--theme-dark' : ''}
                />
            </div>
        </div>
    );
}

export default Completed;
