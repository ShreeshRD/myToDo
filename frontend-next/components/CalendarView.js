'use client'

import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTasks } from '../contexts/TaskContext';
import dayjs from 'dayjs';
import TaskDetailPanel from "./TaskDetailPanel";
import CustomCheckbox from "./CustomCheckbox";
import { RiCheckboxCircleFill, RiCheckboxBlankCircleLine } from "react-icons/ri";

function CalendarView() {
    const { taskDays, completedTasks, overdueTasks, darkMode, updateTask, completedDate, setCompletedDate } = useTasks();
    const initializedRef = useRef(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [panelDate, setPanelDate] = useState(null);
    const [showOverduePanel, setShowOverduePanel] = useState(false);

    const today = dayjs().format('YYYY-MM-DD');

    // Reset to current month when first entering Calendar view
    useEffect(() => {
        if (!initializedRef.current) {
            setCompletedDate(dayjs());
            initializedRef.current = true;
        }
    }, [setCompletedDate]);

    const onDateChange = (date) => {
        setSelectedDate(date);
    };

    const handleDayClick = (value) => {
        // Close overdue panel when clicking a day
        setShowOverduePanel(false);

        if (panelDate && dayjs(value).isSame(dayjs(panelDate), 'day')) {
            setPanelDate(null);
        } else {
            setPanelDate(value);
        }
    };

    const closePanel = () => {
        setPanelDate(null);
    };

    const closeOverduePanel = () => {
        setShowOverduePanel(false);
    };

    const handleOverdueBadgeClick = () => {
        setPanelDate(null); // Close regular panel
        setShowOverduePanel(prev => !prev); // Toggle instead of just opening
    };

    const getPanelTasks = () => {
        if (!panelDate) return [];
        const dateString = dayjs(panelDate).format('YYYY-MM-DD');

        // For past dates, show completed tasks
        if (dateString < today) {
            return completedTasks[dateString] || [];
        }
        // For current/future dates, show pending tasks from taskDays
        // (taskDays already contains both completed and uncompleted for today/future)
        return taskDays[dateString] || [];
    };

    const handleToggleTask = async (task) => {
        await updateTask(task.id, "complete", !task.complete, task.taskDate);
    };

    const handleUncheckOverdueTask = async (task) => {
        // For overdue tasks, we just toggle the complete status
        await updateTask(task.id, "complete", !task.complete, task.taskDate);
    };

    // Get count of overdue tasks
    const overdueCount = overdueTasks?.overdue?.length || 0;

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateString = dayjs(date).format('YYYY-MM-DD');
            let tasks = [];

            // For past dates, show completed tasks
            if (dateString < today) {
                tasks = completedTasks[dateString] || [];
            } else {
                // For current/future dates, show tasks from taskDays
                tasks = taskDays[dateString] || [];
            }

            if (tasks.length > 0) {
                const sortedTasks = [...tasks].sort((a, b) => a.dayOrder - b.dayOrder);
                return (
                    <div className="calendar-tasks">
                        {sortedTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`calendar-task-item ${task.complete ? 'completed' : 'incomplete'}`}
                            >
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
        <div className={`calendar-view completed-calendar-view ${darkMode ? 'dark' : ''}`}>
            {/* Overdue Badge */}
            {overdueCount > 0 && (
                <div
                    className="overdue-badge"
                    onClick={handleOverdueBadgeClick}
                    title={`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`}
                >
                    {overdueCount}
                </div>
            )}

            <div className="completed-view-container">
                <div className={`calendar-container ${(panelDate || showOverduePanel) ? 'shrink' : ''}`}>
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

                {/* Regular Task Panel */}
                <TaskDetailPanel
                    isOpen={!!panelDate && !showOverduePanel}
                    onClose={closePanel}
                    tasks={getPanelTasks()}
                    onToggleTask={handleToggleTask}
                    date={panelDate}
                    darkMode={darkMode}
                />

                {/* Overdue Tasks Panel */}
                <div className={`task-details-panel overdue-panel ${showOverduePanel ? 'open' : ''} ${darkMode ? 'dark' : ''}`}>
                    <div className="panel-header">
                        <h3>Overdue Tasks</h3>
                        <button className="close-btn" onClick={closeOverduePanel}>×</button>
                    </div>
                    <div className="panel-content">
                        {overdueCount > 0 ? (
                            <div className="task-list">
                                {overdueTasks.overdue.map((task) => (
                                    <div key={task.id} className="panel-task-item overdue-task-item">
                                        <div className="task-info">
                                            <span className="task-name">{task.name}</span>
                                            <span className="task-time">Due: {task.taskDate}</span>
                                        </div>
                                        <div className="task-action">
                                            <CustomCheckbox
                                                checked={task.complete}
                                                onChange={() => handleUncheckOverdueTask(task)}
                                                icon={<RiCheckboxBlankCircleLine className="checkbox_icon_unchecked" />}
                                                checkedIcon={<RiCheckboxCircleFill className="checkbox_icon_checked" />}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-tasks">No overdue tasks!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CalendarView;
