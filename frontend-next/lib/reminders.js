import dayjs from 'dayjs';

/** Choices offered in the task editor; values are minutes before the task's time. */
export const REMINDER_OPTIONS = [
    { label: 'No reminder', value: null },
    { label: 'At time of task', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
    { label: '1 hour before', value: 60 },
    { label: '1 day before', value: 1440 },
];

export function reminderLabel(minutes) {
    const option = REMINDER_OPTIONS.find(o => o.value === minutes);
    return option ? option.label : `${minutes} minutes before`;
}

/**
 * When a task's reminder fires (local time), or null when it has none.
 * A reminder needs a date, a time (`assignedTime` "HH:mm[:ss]") and `reminderMinutesBefore`;
 * completed and deleted tasks never remind.
 */
export function reminderFireTime(task) {
    if (!task || task.complete || task.deleted) return null;
    if (task.reminderMinutesBefore === null || task.reminderMinutesBefore === undefined) return null;
    if (!task.taskDate || !task.assignedTime) return null;
    const at = dayjs(`${task.taskDate}T${task.assignedTime}`);
    if (!at.isValid()) return null;
    return at.subtract(task.reminderMinutesBefore, 'minute');
}

/** Stable key so a reminder fires once, but fires again if its time is changed. */
export function reminderKey(task, fireTime) {
    return `${task.uuid || task.id}@${fireTime.valueOf()}`;
}

/**
 * Reminders that should fire now: fire time has passed, but by no more than `graceMs`
 * (so opening the app hours later doesn't replay a backlog), and not fired yet.
 */
export function dueReminders(tasks, now, firedKeys, graceMs = 15 * 60 * 1000) {
    const due = [];
    for (const task of tasks) {
        const fireTime = reminderFireTime(task);
        if (!fireTime) continue;
        const diff = now.valueOf() - fireTime.valueOf();
        if (diff < 0 || diff > graceMs) continue;
        const key = reminderKey(task, fireTime);
        if (firedKeys.has(key)) continue;
        due.push({ task, fireTime, key });
    }
    return due;
}

/** Milliseconds until the next reminder (for scheduling a precise timer), or null. */
export function msUntilNextReminder(tasks, now) {
    let next = null;
    for (const task of tasks) {
        const fireTime = reminderFireTime(task);
        if (!fireTime) continue;
        const diff = fireTime.valueOf() - now.valueOf();
        if (diff > 0 && (next === null || diff < next)) next = diff;
    }
    return next;
}
