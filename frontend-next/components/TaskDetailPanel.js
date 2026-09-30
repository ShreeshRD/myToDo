import React from 'react';
import dayjs from 'dayjs';
import { RiCheckboxCircleFill, RiCheckboxBlankCircleLine, RiCloseLine } from "react-icons/ri";
import CustomCheckbox from "./CustomCheckbox";

function TaskDetailPanel({ isOpen, onClose, tasks, onToggleTask, date }) {
    if (!isOpen) return null;

    const formattedDate = date ? dayjs(date).format('MMMM D, YYYY') : '';
    const weekday = date ? dayjs(date).format('dddd') : '';
    const count = tasks ? tasks.length : 0;

    return (
        <div className={`task-details-panel ${isOpen ? 'open' : ''}`}>
            <div className="panel-header">
                <div className="panel-title">
                    <h3>{formattedDate}</h3>
                    <span className="panel-subtitle">
                        {weekday}{count > 0 ? ` · ${count} task${count === 1 ? '' : 's'}` : ''}
                    </span>
                </div>
                <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
                    <RiCloseLine />
                </button>
            </div>
            <div className="panel-content">
                {tasks && tasks.length > 0 ? (
                    <div className="task-list">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`panel-task-item priority-${task.priority ?? 0}${task.complete ? ' completed' : ''}`}
                            >
                                <div className="task-action">
                                    <CustomCheckbox
                                        checked={task.complete}
                                        onChange={() => onToggleTask(task)}
                                        icon={<RiCheckboxBlankCircleLine className="checkbox_icon_unchecked" />}
                                        checkedIcon={<RiCheckboxCircleFill className="checkbox_icon_checked" />}
                                    />
                                </div>
                                <div className="task-info">
                                    <span className="task-name">{task.name}</span>
                                    {task.assignedTime && (
                                        <span className="task-time">
                                            {dayjs(task.taskDate + 'T' + task.assignedTime).format('h:mm A')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-tasks">No tasks for this day</p>
                )}
            </div>
        </div>
    );
}

export default TaskDetailPanel;
