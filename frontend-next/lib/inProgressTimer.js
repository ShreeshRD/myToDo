// Tracks when a task was marked in progress so the elapsed wall time can be
// folded into timeTaken when the task is unmarked or completed.
// Persisted in localStorage so a page reload does not lose the start time.

const STORAGE_KEY = 'todoInProgressSessions';

const readAll = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

const writeAll = (all) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
        // storage unavailable (private mode etc.) — timing degrades to no-op
    }
};

// Idempotent: an already-open session keeps its original start time.
export const startInProgressSession = (taskId) => {
    const all = readAll();
    const key = String(taskId);
    if (all[key] === undefined) {
        all[key] = Date.now();
        writeAll(all);
    }
};

// Closes the session and returns the elapsed ms, or null if none was open.
export const endInProgressSession = (taskId) => {
    const all = readAll();
    const key = String(taskId);
    const startedAt = all[key];
    if (startedAt === undefined) return null;
    delete all[key];
    writeAll(all);
    return Date.now() - startedAt;
};

export const clearInProgressSession = (taskId) => {
    const all = readAll();
    const key = String(taskId);
    if (all[key] !== undefined) {
        delete all[key];
        writeAll(all);
    }
};
