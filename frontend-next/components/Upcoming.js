'use client'

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import ToDoDay from "./ToDoDay";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTasks } from "../contexts/TaskContext";

function Upcoming() {
    const { showPopup, darkMode, callPopup, updateTask, removeTask, handleDragEnd, taskDays, overdueTasks } = useTasks();

    // Track client-side mount to avoid SSR date mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render date-dependent content until mounted on the client
    // This prevents static HTML from having stale build-time dates
    if (!mounted) {
        return (
            <div className={`weekItems ${showPopup ? 'inactive' : ''}`}>
                {/* Loading placeholder - will be replaced immediately on client mount */}
            </div>
        );
    }

    // Compute dates fresh from dayjs() - only runs after client mount
    const today = dayjs().startOf('day');
    const dates = Array.from({ length: 7 }, (_, index) => {
        return today.add(index, 'day').format('YYYY-MM-DD');
    });

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className={`weekItems ${showPopup ? 'inactive' : ''}`}>
                {overdueTasks.overdue.length > 0 && (
                    <ToDoDay
                        key={-1}
                        id={100}
                        date="Overdue"
                        tasks={overdueTasks.overdue}
                        updateTask={updateTask}
                        delTask={removeTask}
                        callPop={callPopup}
                    />
                )}
                {dates.map((date, index) => {
                    const tasks = taskDays[date] || [];
                    const sortedTasks = [...tasks].sort((a, b) => a.dayOrder - b.dayOrder);
                    return (
                        <ToDoDay
                            key={index}
                            id={index}
                            date={date}
                            tasks={sortedTasks}
                            updateTask={updateTask}
                            delTask={removeTask}
                            callPop={callPopup}
                        />
                    );
                })}
            </div>
        </DragDropContext>
    )
}

export default Upcoming
