'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useTasks } from './TaskContext';

const StopwatchContext = createContext();

export const useStopwatch = () => useContext(StopwatchContext);

export const StopwatchProvider = ({ children }) => {
    const { updateTask } = useTasks();
    const [stopwatches, setStopwatches] = useState({}); // { taskId: { startTime, elapsedTime, isRunning, task } }
    const intervalRef = useRef(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setStopwatches(prev => {
                const next = { ...prev };
                let changed = false;
                for (const taskId in next) {
                    if (next[taskId].isRunning) {
                        next[taskId] = {
                            ...next[taskId],
                            // visual elapsed time = persisted (or accumulated) + current run
                            elapsedTime: (next[taskId].elapsedTime || 0) + (Date.now() - next[taskId].startTime)
                        };
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, []);

    const startStopwatch = (task) => {
        setStopwatches(prev => {
            if (prev[task.id]) {
                // Already exists, just resume if paused
                if (!prev[task.id].isRunning) {
                    const now = Date.now();
                    // Adjust start time so that (now - startTime) equals (elapsedTime + new elapsed)
                    // We want resume: newStartTime = now - oldElapsedTime
                    return {
                        ...prev,
                        [task.id]: {
                            ...prev[task.id],
                            isRunning: true,
                            startTime: now - prev[task.id].elapsedTime
                        }
                    };
                }
                return prev;
            }

            // New stopwatch
            return {
                ...prev,
                [task.id]: {
                    task,
                    startTime: Date.now(),
                    elapsedTime: 0,
                    isRunning: true
                }
            }
        });

        // Mark task in progress
        updateTask(task.id, "inProgress", true, task.taskDate);
    };

    const pauseStopwatch = (taskId, taskDate) => { // Added taskDate param for updateTask
        setStopwatches(prev => {
            if (!prev[taskId]) return prev;
            return {
                ...prev,
                [taskId]: {
                    ...prev[taskId],
                    isRunning: false
                }
            };
        });
        updateTask(taskId, "inProgress", false, taskDate);
    };

    // Correct implementations for direct calls

    const toggleStopwatch = (task) => {
        setStopwatches(current => {
            const sw = current[task.id];
            if (sw && sw.isRunning) {
                // Pause - Persist Time
                setTimeout(() => {
                    const elapsedTime = Date.now() - sw.startTime;
                    const totalTime = (task.timeTaken || 0) + elapsedTime;
                    // Update persistence
                    updateTask(task.id, "timeTaken", totalTime, task.taskDate);
                    // Update in progress status
                    updateTask(task.id, "inProgress", false, task.taskDate);
                }, 0);

                return {
                    ...current,
                    [task.id]: {
                        ...sw,
                        isRunning: false,
                        elapsedTime: sw.elapsedTime + (Date.now() - sw.startTime) // accumulate current run
                    }
                };
            } else if (sw && !sw.isRunning) {
                // Resume
                setTimeout(() => updateTask(task.id, "inProgress", true, task.taskDate), 0);
                return {
                    ...current,
                    [task.id]: {
                        ...sw,
                        isRunning: true,
                        startTime: Date.now() // reset start time for new run
                    }
                };
            } else {
                // Start new
                setTimeout(() => updateTask(task.id, "inProgress", true, task.taskDate), 0);
                return {
                    ...current,
                    [task.id]: {
                        task,
                        startTime: Date.now(),
                        elapsedTime: task.timeTaken || 0,
                        isRunning: true
                    }
                }
            }
        });
    };

    const stopStopwatch = async (task) => {
        // Get the stopwatch state synchronously before setting state
        let totalTime = 0;

        setStopwatches(current => {
            const sw = current[task.id];
            if (sw) {
                // Convert any running time to persisted time
                if (sw.isRunning) {
                    const runTime = Date.now() - sw.startTime;
                    // sw.elapsedTime tracks the accumulated time from previous runs + initial task.timeTaken
                    // For a fresh start: sw.elapsedTime = task.timeTaken || 0
                    // After pause/resume: sw.elapsedTime has accumulated time
                    totalTime = sw.elapsedTime + runTime;
                } else {
                    // Timer was paused - elapsedTime already has the total accumulated time
                    totalTime = sw.elapsedTime;
                }
            }
            const next = { ...current };
            delete next[task.id];
            return next;
        });

        // Update backend with the calculated totalTime
        if (totalTime > 0) {
            await updateTask(task.id, "timeTaken", totalTime, task.taskDate);
        }
        await updateTask(task.id, "inProgress", false, task.taskDate);

        return totalTime;
    }

    const removeStopwatch = (taskId) => {
        setStopwatches(prev => {
            const next = { ...prev };
            delete next[taskId];
            return next;
        });
    };

    return (
        <StopwatchContext.Provider value={{ stopwatches, startStopwatch, pauseStopwatch, toggleStopwatch, removeStopwatch, stopStopwatch }}>
            {children}
        </StopwatchContext.Provider>
    );
};
