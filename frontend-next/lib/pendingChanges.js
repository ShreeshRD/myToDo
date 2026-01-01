/**
 * Pending Changes Queue
 * 
 * Manages localStorage-based queue of changes waiting to sync with backend.
 * Enables optimistic UI updates that persist across page refreshes.
 */

const PENDING_CHANGES_KEY = 'todo-pending-changes';

/**
 * Generate a unique ID for a pending change
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get all pending changes from localStorage
 * @returns {Array} Array of pending change objects
 */
export const getPendingChanges = () => {
    try {
        const stored = localStorage.getItem(PENDING_CHANGES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading pending changes:', error);
        return [];
    }
};

/**
 * Save pending changes to localStorage
 * @param {Array} changes - Array of pending change objects
 */
const savePendingChanges = (changes) => {
    try {
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
    } catch (error) {
        console.error('Error saving pending changes:', error);
    }
};

/**
 * Add a new pending change to the queue
 * @param {Object} change - Change object with type, taskId, and relevant data
 * @returns {string} The generated ID for this change
 */
export const addPendingChange = (change) => {
    const id = generateId();
    const pendingChange = {
        id,
        timestamp: Date.now(),
        ...change
    };

    const changes = getPendingChanges();
    changes.push(pendingChange);
    savePendingChanges(changes);

    return id;
};

/**
 * Remove a pending change from the queue (after successful sync)
 * @param {string} id - The ID of the change to remove
 */
export const removePendingChange = (id) => {
    const changes = getPendingChanges();
    const filtered = changes.filter(c => c.id !== id);
    savePendingChanges(filtered);
};

/**
 * Clear all pending changes (use with caution)
 */
export const clearPendingChanges = () => {
    savePendingChanges([]);
};

/**
 * Apply pending changes to taskDays data
 * This merges pending changes over fetched backend data
 * @param {Object} taskDays - Current taskDays object from backend
 * @param {Object} overdueTasks - Current overdueTasks object
 * @returns {Object} { taskDays, overdueTasks } with pending changes applied
 */
export const applyPendingChanges = (taskDays, overdueTasks) => {
    const changes = getPendingChanges();

    if (changes.length === 0) {
        return { taskDays, overdueTasks };
    }

    // Sort by timestamp to apply in order
    const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);

    let modifiedTaskDays = { ...taskDays };
    let modifiedOverdue = { ...overdueTasks, overdue: [...(overdueTasks.overdue || [])] };

    for (const change of sortedChanges) {
        switch (change.type) {
            case 'MOVE_TASK': {
                const { taskId, sourceDate, destDate, predecessorTaskId, taskData } = change;

                // Remove from source (could be overdue or taskDays)
                if (sourceDate === 'overdue') {
                    modifiedOverdue.overdue = modifiedOverdue.overdue.filter(
                        t => t.id.toString() !== taskId.toString()
                    );
                } else if (modifiedTaskDays[sourceDate]) {
                    modifiedTaskDays[sourceDate] = modifiedTaskDays[sourceDate].filter(
                        t => t.id.toString() !== taskId.toString()
                    );
                }

                // Find the task data (might be in current state or stored in change)
                let taskToMove = taskData;
                if (!taskToMove) {
                    // Try to find in modified state
                    for (const date in modifiedTaskDays) {
                        const found = modifiedTaskDays[date]?.find(
                            t => t.id.toString() === taskId.toString()
                        );
                        if (found) {
                            taskToMove = { ...found, taskDate: destDate };
                            // Remove from current location
                            modifiedTaskDays[date] = modifiedTaskDays[date].filter(
                                t => t.id.toString() !== taskId.toString()
                            );
                            break;
                        }
                    }
                    // Check overdue
                    if (!taskToMove) {
                        const found = modifiedOverdue.overdue.find(
                            t => t.id.toString() === taskId.toString()
                        );
                        if (found) {
                            taskToMove = { ...found, taskDate: destDate };
                            modifiedOverdue.overdue = modifiedOverdue.overdue.filter(
                                t => t.id.toString() !== taskId.toString()
                            );
                        }
                    }
                }

                if (taskToMove) {
                    // Ensure destination array exists
                    if (!modifiedTaskDays[destDate]) {
                        modifiedTaskDays[destDate] = [];
                    }

                    // Find insert position
                    let insertIndex = 0;
                    if (predecessorTaskId) {
                        const predIndex = modifiedTaskDays[destDate].findIndex(
                            t => t.id.toString() === predecessorTaskId.toString()
                        );
                        if (predIndex !== -1) {
                            insertIndex = predIndex + 1;
                        }
                    }

                    // Insert task and update dayOrder
                    const destList = [...modifiedTaskDays[destDate]];
                    destList.splice(insertIndex, 0, { ...taskToMove, taskDate: destDate });
                    modifiedTaskDays[destDate] = destList.map((t, i) => ({
                        ...t,
                        dayOrder: i + 1
                    }));
                }
                break;
            }

            case 'UPDATE_FIELD': {
                const { taskId, field, value, date } = change;

                // Update in overdue
                modifiedOverdue.overdue = modifiedOverdue.overdue.map(t =>
                    t.id.toString() === taskId.toString()
                        ? { ...t, [field]: value }
                        : t
                );

                // Update in taskDays
                if (date && modifiedTaskDays[date]) {
                    modifiedTaskDays[date] = modifiedTaskDays[date].map(t =>
                        t.id.toString() === taskId.toString()
                            ? { ...t, [field]: value }
                            : t
                    );
                } else {
                    // Search all dates
                    for (const d in modifiedTaskDays) {
                        modifiedTaskDays[d] = modifiedTaskDays[d].map(t =>
                            t.id.toString() === taskId.toString()
                                ? { ...t, [field]: value }
                                : t
                        );
                    }
                }
                break;
            }

            case 'DELETE_TASK': {
                const { taskId, date } = change;

                // Remove from overdue
                modifiedOverdue.overdue = modifiedOverdue.overdue.filter(
                    t => t.id.toString() !== taskId.toString()
                );

                // Remove from taskDays
                if (date && modifiedTaskDays[date]) {
                    modifiedTaskDays[date] = modifiedTaskDays[date].filter(
                        t => t.id.toString() !== taskId.toString()
                    );
                }
                break;
            }

            default:
                console.warn('Unknown pending change type:', change.type);
        }
    }

    return { taskDays: modifiedTaskDays, overdueTasks: modifiedOverdue };
};

/**
 * Check if there are any pending changes
 * @returns {boolean}
 */
export const hasPendingChanges = () => {
    return getPendingChanges().length > 0;
};

/**
 * Get count of pending changes
 * @returns {number}
 */
export const getPendingChangeCount = () => {
    return getPendingChanges().length;
};
