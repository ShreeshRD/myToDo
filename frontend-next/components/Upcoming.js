'use client'

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import ToDoDay from "./ToDoDay";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTasks } from "../contexts/TaskContext";

function Upcoming() {
    const { showPopup, callPopup, updateTask, removeTask, handleDragEnd, taskDays, overdueTasks, startDate, completedTasks } = useTasks();

    // Track client-side mount to avoid SSR date mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
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

    // Compute dates starting from startDate (which defaults to today but can be shifted)
    const dates = Array.from({ length: 7 }, (_, index) => {
        return startDate.add(index, 'day').format('YYYY-MM-DD');
    });

    const todayStr = dayjs().format('YYYY-MM-DD');

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
                    let tasks = [];
                    // formatting comparison: 'YYYY-MM-DD' strings compare correctly alphabetically
                    if (date < todayStr) {
                        // Past: Only show completed tasks
                        tasks = completedTasks[date] || [];
                    } else {
                        // Today/Future: Show active tasks (which includes completed ones for today/future)
                        tasks = taskDays[date] || [];
                    }

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
