'use client'

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { IoNotificationsOutline, IoClose } from 'react-icons/io5';
import useReminders from '../hooks/useReminders';
import { useTasks } from '../contexts/TaskContext';
import '../styles/reminders.scss';

const PROMPT_DISMISSED_KEY = 'reminders-prompt-dismissed';

/** Reminder toasts plus a one-time prompt to allow desktop notifications. */
export default function ReminderCenter() {
    const { allOpenTasks = [], callPopup, updateTask } = useTasks();
    const { toasts, dismiss, permission, requestPermission } = useReminders(
        allOpenTasks,
        (task) => callPopup(task.taskDate, task),
    );
    const [promptDismissed, setPromptDismissed] = useState(() => {
        try {
            return localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const hasReminders = allOpenTasks.some(t => t.reminderMinutesBefore !== null && t.reminderMinutesBefore !== undefined);
    const showPrompt = hasReminders && permission === 'default' && !promptDismissed;

    const hidePrompt = () => {
        setPromptDismissed(true);
        try {
            localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
        } catch {
            // ignore
        }
    };

    if (!showPrompt && toasts.length === 0) return null;

    return (
        <div className="reminder-center" aria-live="polite">
            {showPrompt && (
                <div className="reminder-toast reminder-toast--prompt">
                    <IoNotificationsOutline className="reminder-toast__icon" />
                    <div className="reminder-toast__body">
                        <div className="reminder-toast__title">Get reminder notifications</div>
                        <div className="reminder-toast__meta">Allow notifications so reminders appear even when this tab is in the background.</div>
                        <div className="reminder-toast__actions">
                            <button className="reminder-btn reminder-btn--primary" onClick={() => { requestPermission(); hidePrompt(); }}>Allow</button>
                            <button className="reminder-btn" onClick={hidePrompt}>Not now</button>
                        </div>
                    </div>
                </div>
            )}
            {toasts.map(({ key, task }) => (
                <div key={key} className="reminder-toast" role="alert">
                    <IoNotificationsOutline className="reminder-toast__icon" />
                    <div className="reminder-toast__body">
                        <div className="reminder-toast__title">{task.name}</div>
                        <div className="reminder-toast__meta">
                            {dayjs(`2000-01-01T${task.assignedTime}`).format('h:mm A')}
                            {task.category && task.category !== 'None' ? ` · #${task.category}` : ''}
                        </div>
                        <div className="reminder-toast__actions">
                            <button
                                className="reminder-btn reminder-btn--primary"
                                onClick={() => { updateTask(task.id, 'complete', true, task.taskDate); dismiss(key); }}
                            >
                                Mark done
                            </button>
                            <button className="reminder-btn" onClick={() => { callPopup(task.taskDate, task); dismiss(key); }}>Open</button>
                        </div>
                    </div>
                    <button className="reminder-toast__close" aria-label="Dismiss" onClick={() => dismiss(key)}><IoClose /></button>
                </div>
            ))}
        </div>
    );
}
