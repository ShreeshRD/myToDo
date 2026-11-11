'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { useTasks } from '../contexts/TaskContext';
import { useUI } from '../contexts/UIContext';
import { pushTask } from '../service';
import '../styles/PushTaskPopup.css';

const QUICK_DATES = [
    { label: '+1d', days: 1 },
    { label: '+3d', days: 3 },
    { label: '+1w', days: 7 },
];

function PushForm({ task, theme, onCancel, onPushed }) {
    const today = dayjs().startOf('day');
    // Offsets are relative to the task's own date so "push +1" moves a task on
    // the 12th to the 13th. Overdue tasks fall back to today so the destination
    // is never in the past.
    const scheduled = task.taskDate ? dayjs(task.taskDate).startOf('day') : today;
    const baseDate = scheduled.isBefore(today) ? today : scheduled;
    const minDate = today.format('YYYY-MM-DD');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(baseDate.add(1, 'day').format('YYYY-MM-DD'));
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const canSubmit = reason.trim().length > 0 && Boolean(date) && !saving;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('A reason is required.');
            return;
        }
        if (!date || dayjs(date).isBefore(today)) {
            setError('Pick today or a later date.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await pushTask(task.id, trimmed, date);
            await onPushed();
        } catch (err) {
            const message = err?.response?.data?.message;
            setError(message || 'Could not push this task. Try again.');
            setSaving(false);
        }
    };

    // Ctrl/Cmd + Enter submits from anywhere in the dialog.
    const handleKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            handleSubmit(event);
        }
    };

    return (
        <form
            className={`push-popup ${theme}`}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleKeyDown}
            onSubmit={handleSubmit}
        >
            <div className="push-popup-header">
                <h2>Push task</h2>
                <button type="button" className="push-close" onClick={onCancel} aria-label="Close push dialog">
                    ×
                </button>
            </div>

            <p className="push-task-name">{task.name}</p>
            <p className="push-hint">
                Marks this task complete now and creates a deferred copy with the unchecked
                checklist items.
            </p>

            <label className="push-label" htmlFor="push-reason">Reason</label>
            <textarea
                id="push-reason"
                className="push-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Why can't this happen right now?"
                autoFocus
            />

            <label className="push-label" htmlFor="push-date">Move it to</label>
            <div className="push-date-row">
                <input
                    id="push-date"
                    type="date"
                    className="push-date"
                    value={date}
                    min={minDate}
                    onChange={(event) => setDate(event.target.value)}
                />
                <div className="push-quick-dates">
                    {QUICK_DATES.map((quick) => (
                        <button
                            key={quick.label}
                            type="button"
                            className="push-quick"
                            onClick={() => setDate(baseDate.add(quick.days, 'day').format('YYYY-MM-DD'))}
                        >
                            {quick.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="push-error">{error}</p>}

            <div className="push-actions">
                <button type="button" className="push-cancel" onClick={onCancel} disabled={saving}>
                    Cancel
                </button>
                <button type="submit" className="push-submit" disabled={!canSubmit}>
                    {saving ? 'Pushing…' : 'Push'}
                </button>
            </div>
        </form>
    );
}

function PushTaskPopup() {
    const { pushTaskItem, closePush, handlePushed } = useTasks();
    const { theme } = useUI();

    if (!pushTaskItem || typeof document === 'undefined') return null;

    return createPortal(
        <div className={`push-popup-backdrop ${theme}`} onMouseDown={closePush}>
            <PushForm
                key={pushTaskItem.id}
                task={pushTaskItem}
                theme={theme}
                onCancel={closePush}
                onPushed={handlePushed}
            />
        </div>,
        document.body
    );
}

export default PushTaskPopup;
