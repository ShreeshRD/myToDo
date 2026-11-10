'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { useTasks } from '../contexts/TaskContext';
import { useUI } from '../contexts/UIContext';
import { getTaskEvents } from '../service';
import { formatTimeTaken } from '../lib/dateHelpers';
import '../styles/TaskDetailDrawer.css';

const EVENT_LABELS = {
    CREATED: 'Created',
    COMPLETED: 'Completed',
    UNCOMPLETED: 'Reopened',
    EDITED: 'Edited',
    PUSHED: 'Pushed',
};

function DescriptionEditor({ task, updateTask }) {
    // key={task.id} remounts this editor when the selected task changes,
    // so we only need a local draft — no render-time sync with the store.
    const [draft, setDraft] = useState(task.description || '');

    const handleBlur = () => {
        const current = task.description || '';
        if (draft === current) return;
        updateTask(task.id, 'description', draft, task.taskDate);
    };

    return (
        <textarea
            className="drawer-description"
            placeholder="Add notes…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            rows={4}
        />
    );
}

function TaskEventTimeline({ task }) {
    const [state, setState] = useState({ taskId: null, events: [], error: null });

    // Refetch when the selected task changes or its activity-relevant fields update.
    useEffect(() => {
        if (!task) return;
        let cancelled = false;
        getTaskEvents(task.id)
            .then((data) => {
                if (!cancelled) {
                    setState({
                        taskId: task.id,
                        events: Array.isArray(data) ? data : [],
                        error: null,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState({ taskId: task.id, events: [], error: 'Could not load timeline' });
                }
            });
        return () => { cancelled = true; };
    }, [task?.id, task?.complete, task?.completedAt, task?.description,
        task?.name, task?.category, task?.taskDate]);

    // Ignore a previous task's timeline while the new one loads.
    if (!task || state.taskId !== task.id) {
        return <p className="drawer-empty">Loading timeline…</p>;
    }

    if (state.error) {
        return <p className="drawer-empty">{state.error}</p>;
    }

    if (state.events.length === 0) {
        return <p className="drawer-empty">No activity recorded yet.</p>;
    }

    // Newest first — latest activity at the top.
    const orderedEvents = [...state.events].reverse();

    return (
        <ol className="drawer-timeline">
            {orderedEvents.map((event) => (
                <li key={event.id} className={`timeline-event type-${(event.type || '').toLowerCase()}`}>
                    <div className="timeline-top">
                        <span className="timeline-type">{EVENT_LABELS[event.type] || event.type}</span>
                        <span className="timeline-time">
                            {dayjs(event.createdAt).format('D MMM YYYY, h:mm A')}
                        </span>
                    </div>
                    {event.detail && <p className="timeline-detail">{event.detail}</p>}
                    {(event.fromDate || event.toDate) && (
                        <p className="timeline-detail">
                            {event.fromDate ? dayjs(event.fromDate).format('D MMM') : '—'}
                            {' → '}
                            {event.toDate ? dayjs(event.toDate).format('D MMM YYYY') : '—'}
                        </p>
                    )}
                </li>
            ))}
        </ol>
    );
}

function TaskDetailDrawer() {
    const { detailTask, closeDetail, updateTask, showPopup } = useTasks();
    const { theme } = useUI();
    const drawerRef = useRef(null);
    const task = detailTask;

    // Hide behind the create/edit popup so the two surfaces never stack visually.
    useEffect(() => {
        if (!task || showPopup) return undefined;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeDetail();
            }
        };

        // Close when the user interacts outside the drawer. Use mousedown so it
        // fires before the next click (e.g. selecting another task). openDetail
        // always re-opens after this close, so a click on a task title sticks.
        const handlePointerDown = (e) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target)) {
                closeDetail();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [task, showPopup, closeDetail]);

    if (!task || showPopup || typeof document === 'undefined') return null;

    const metaRows = [
        task.category && task.category !== 'None' ? { label: 'Project', value: `#${task.category}` } : null,
        { label: 'Scheduled', value: task.taskDate ? dayjs(task.taskDate).format('ddd D MMM YYYY') : '—' },
        task.assignedTime && task.assignedTime !== 'null'
            ? { label: 'Time', value: dayjs(`2000-01-01T${task.assignedTime}`).format('h:mm A') }
            : null,
        task.createdAt
            ? { label: 'Created', value: dayjs(task.createdAt).format('D MMM YYYY, h:mm A') }
            : null,
        task.complete && task.completedAt
            ? { label: 'Completed', value: dayjs(task.completedAt).format('D MMM YYYY, h:mm A') }
            : null,
        task.timeTaken > 0 ? { label: 'Time spent', value: formatTimeTaken(task.timeTaken) } : null,
        task.repeatType && task.repeatType !== 'NONE'
            ? { label: 'Repeat', value: task.repeatType.replaceAll('_', ' ').toLowerCase() }
            : null,
        task.longTerm ? { label: 'Type', value: 'Long-term' } : null,
    ].filter(Boolean);

    // Portal to body so the drawer (and its backdrop blur) sit outside
    // .app-container — nested stacking contexts can break backdrop-filter.
    return createPortal(
        <>
            {/* Blur veil: only under the panel, so calendar text behind goes soft */}
            <div className={`task-drawer-veil ${theme}`} aria-hidden="true" />
            <aside
                ref={drawerRef}
                className={`task-detail-drawer ${theme}`}
                aria-label="Task details"
            >
                <div className="drawer-header">
                    <h2 className={task.complete ? 'strikethrough' : ''}>{task.name}</h2>
                    <button className="drawer-close" onClick={closeDetail} aria-label="Close details">×</button>
                </div>

                <div className="drawer-body">
                    <section className="drawer-section">
                        <h3>Notes</h3>
                        <DescriptionEditor key={task.id} task={task} updateTask={updateTask} />
                    </section>

                    <section className="drawer-section">
                        <h3>Details</h3>
                        <dl className="drawer-meta">
                            {metaRows.map(({ label, value }) => (
                                <div key={label} className="drawer-meta-row">
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <section className="drawer-section">
                        <h3>Activity</h3>
                        <TaskEventTimeline task={task} />
                    </section>
                </div>
            </aside>
        </>,
        document.body
    );
}

export default TaskDetailDrawer;
