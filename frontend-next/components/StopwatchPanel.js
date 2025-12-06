'use client'

import React, { useState } from 'react';
import { useStopwatch } from '../contexts/StopwatchContext';
import { FaPlay, FaPause, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../styles/StopwatchPanel.css';

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
};

const StopwatchPanel = () => {
    const { stopwatches, toggleStopwatch } = useStopwatch();
    const [isMinimized, setIsMinimized] = useState(false);

    const activeIds = Object.keys(stopwatches);
    if (activeIds.length === 0) return null;

    return (
        <div className={`stopwatch-panel ${isMinimized ? 'minimized' : ''}`}>
            <div className="stopwatch-header" onClick={() => setIsMinimized(!isMinimized)}>
                <span>Active Timers ({activeIds.length})</span>
                {isMinimized ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {!isMinimized && (
                <ul className="stopwatch-list">
                    {activeIds.map(taskId => {
                        const sw = stopwatches[taskId];
                        return (
                            <li key={taskId} className="stopwatch-item">
                                <span className="stopwatch-task-name" title={sw.task.name}>
                                    {sw.task.name}
                                </span>
                                <div className="stopwatch-controls">
                                    <span className="stopwatch-time">{formatTime(sw.elapsedTime)}</span>
                                    <button
                                        className="stopwatch-btn"
                                        onClick={() => toggleStopwatch(sw.task)}
                                    >
                                        {sw.isRunning ? <FaPause /> : <FaPlay />}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default StopwatchPanel;
