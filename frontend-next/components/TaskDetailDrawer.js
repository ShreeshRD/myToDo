'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { useTasks } from '../contexts/TaskContext';
import { useUI } from '../contexts/UIContext';
import { getTaskEvents, getSubtasks, addSubtask, updateSubtask, reorderSubtasks, deleteSubtask } from '../service';
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

function SubtaskRow({ item, index, count, onToggle, onRename, onDelete, onMove }) {
    // Keep the draft local; persist only on blur so typing does not spam the API.
    // Server responses match the draft after a successful save, so no prop sync is needed.
    const [draft, setDraft] = useState(item.title);

    const commitTitle = () => {
        const next = draft.trim();
        if (!next || next === item.title) {
            setDraft(item.title);
            return;
        }
        onRename(item.id, next);
    };

    return (
        <li className={`subtask-row${item.done ? ' done' : ''}`}>
            <input
                type="checkbox"
                className="subtask-check"
                checked={!!item.done}
                onChange={() => onToggle(item)}
                aria-label={`Mark "${item.title}" ${item.done ? 'not done' : 'done'}`}
            />
            <input
                type="text"
                className="subtask-title"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                }}
            />
            <div className="subtask-actions">
                <button
                    type="button"
                    className="subtask-action"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    aria-label="Move subtask up"
                >
                    ↑
                </button>
                <button
                    type="button"
                    className="subtask-action"
                    onClick={() => onMove(index, 1)}
                    disabled={index === count - 1}
                    aria-label="Move subtask down"
                >
                    ↓
                </button>
                <button
                    type="button"
                    className="subtask-action subtask-delete"
                    onClick={() => onDelete(item.id)}
                    aria-label="Delete subtask"
                >
                    ×
                </button>
            </div>
        </li>
    );
}

function TaskChecklist({ task, refreshSubtaskCounts }) {
    const [state, setState] = useState({ taskId: null, items: [], error: null });
    const [draft, setDraft] = useState('');
    const taskId = task?.id;

    useEffect(() => {
        if (!taskId) return undefined;
        let cancelled = false;
        getSubtasks(taskId)
            .then((items) => {
                if (!cancelled) {
                    setState({ taskId, items: Array.isArray(items) ? items : [], error: null });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState({ taskId, items: [], error: 'Could not load checklist' });
                }
            });
        return () => { cancelled = true; };
    }, [taskId]);

    if (!task || state.taskId !== task.id) {
        return <p className="drawer-empty">Loading checklist…</p>;
    }

    const items = state.items;
    const done = items.filter((item) => item.done).length;

    const replaceItems = (next) => setState((prev) => ({ ...prev, items: next, error: null }));

    const handleAdd = async () => {
        const title = draft.trim();
        if (!title) return;
        try {
            const created = await addSubtask(task.id, title);
            replaceItems([...items, created]);
            setDraft('');
            refreshSubtaskCounts();
        } catch {
            setState((prev) => ({ ...prev, error: 'Could not add item' }));
        }
    };

    const handleToggle = async (item) => {
        try {
            const updated = await updateSubtask(item.id, { done: String(!item.done) });
            replaceItems(items.map((row) => (row.id === item.id ? updated : row)));
            refreshSubtaskCounts();
        } catch {
            setState((prev) => ({ ...prev, error: 'Could not update item' }));
        }
    };

    const handleRename = async (id, title) => {
        try {
            const updated = await updateSubtask(id, { title });
            replaceItems(items.map((row) => (row.id === id ? updated : row)));
        } catch {
            setState((prev) => ({ ...prev, error: 'Could not rename item' }));
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSubtask(id);
            replaceItems(items.filter((row) => row.id !== id));
            refreshSubtaskCounts();
        } catch {
            setState((prev) => ({ ...prev, error: 'Could not delete item' }));
        }
    };

    const handleMove = async (index, delta) => {
        const target = index + delta;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        replaceItems(next);
        try {
            const saved = await reorderSubtasks(task.id, next.map((row) => row.id));
            replaceItems(Array.isArray(saved) ? saved : next);
        } catch {
            setState((prev) => ({ ...prev, error: 'Could not reorder checklist' }));
        }
    };

    return (
        <div className="subtask-checklist">
            {items.length > 0 && (
                <div className="subtask-summary">{done}/{items.length} done</div>
            )}
            <ul className="subtask-list">
                {items.map((item, index) => (
                    <SubtaskRow
                        key={item.id}
                        item={item}
                        index={index}
                        count={items.length}
                        onToggle={handleToggle}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onMove={handleMove}
                    />
                ))}
            </ul>
            {state.error && <p className="drawer-empty">{state.error}</p>}
            <div className="subtask-add">
                <input
                    type="text"
                    className="subtask-title"
                    placeholder="Add checklist item…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                />
                <button type="button" className="subtask-add-button" onClick={handleAdd} disabled={!draft.trim()}>
                    Add
                </button>
            </div>
        </div>
    );
}

function TaskDetailDrawer() {
    const { detailTask, closeDetail, updateTask, openPush, showPopup, refreshSubtaskCounts } = useTasks();
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
        task.pushCount > 0 ? { label: 'Pushed', value: `${task.pushCount}×` } : null,
        task.pushedFromId ? { label: 'Pushed from', value: `Task #${task.pushedFromId}` } : null,
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

                {!task.complete && (
                    <div className="drawer-actions">
                        <button
                            type="button"
                            className="drawer-push"
                            onClick={() => openPush(task)}
                        >
                            Push to another day…
                        </button>
                    </div>
                )}

                <div className="drawer-body">
                    <section className="drawer-section">
                        <h3>Notes</h3>
                        <DescriptionEditor key={task.id} task={task} updateTask={updateTask} />
                    </section>

                    <section className="drawer-section">
                        <h3>Checklist</h3>
                        <TaskChecklist task={task} refreshSubtaskCounts={refreshSubtaskCounts} />
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
