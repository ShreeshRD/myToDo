'use client'

import React from 'react';
import { useTasks } from '../contexts/TaskContext';
import dayjs from 'dayjs';
import '../styles/Heatmap.scss';

function Heatmap({ currentDate, tasksByDate }) {
    const { completedTasks } = useTasks();
    // Global heatmap: only long-term (growth) completions count.
    // A caller may pass its own pre-filtered data (e.g. per-skill occurrences).
    const source = tasksByDate || completedTasks;
    const today = currentDate ? dayjs(currentDate) : dayjs();
    const startOfMonth = today.startOf('month');
    const daysInMonth = today.daysInMonth();
    const startDayOfWeek = startOfMonth.day(); // 0 (Sunday) to 6 (Saturday)

    // Calculate padding for Monday start
    // Mon (1) -> 0 padding
    // Sun (0) -> 6 padding
    const paddingCount = (startDayOfWeek + 6) % 7;
    const paddingDays = Array.from({ length: paddingCount }, (_, i) => i);

    // Generate array of days for the current month
    const days = Array.from({ length: daysInMonth }, (_, i) => {
        return startOfMonth.add(i, 'day');
    });

    const getIntensityClass = (count) => {
        if (count === 0) return 'intensity-0';
        if (count <= 1) return 'intensity-1';
        if (count <= 2) return 'intensity-2';
        if (count <= 3) return 'intensity-3';
        if (count <= 4) return 'intensity-4';
        return 'intensity-5';
    };

    return (
        <div className="heatmap-container">
            <div className="heatmap-grid">
                {paddingDays.map((_, index) => (
                    <div key={`pad-${index}`} className="heatmap-cell empty-pad"></div>
                ))}
                {days.map((day) => {
                    const dateString = day.format('YYYY-MM-DD');
                    const tasks = tasksByDate
                        ? (source[dateString] || [])
                        : (source[dateString] || []).filter(task => task.longTerm);
                    const count = tasks.length;

                    return (
                        <div 
                            key={dateString} 
                            className={`heatmap-cell ${getIntensityClass(count)}`}
                            title={`${dateString}: ${count} long-term task${count === 1 ? '' : 's'}`}
                        >
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Heatmap;
