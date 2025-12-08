import React from 'react';
import dayjs from 'dayjs';
import { RiCheckboxCircleFill, RiCheckboxBlankCircleLine } from "react-icons/ri";
import CustomCheckbox from "./CustomCheckbox";

function TaskDetailPanel({ isOpen, onClose, tasks, onToggleTask, date }) {
    if (!isOpen) return null;

    const formattedDate = date ? dayjs(date).format('MMMM D, YYYY') : '';

    return (
        <div className={`task-details-panel ${isOpen ? 'open' : ''}`}>
            <div className="panel-header">
                <h3>{formattedDate}</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="panel-content">
                {tasks && tasks.length > 0 ? (
                    <div className="task-list">
                        {tasks.map((task) => (
                            <div key={task.id} className="panel-task-item">
                                <div className="task-info">
                                    <span className="task-name">{task.name}</span>
                                    {task.assignedTime && (
                                        <span className="task-time">
                                            {dayjs(task.taskDate + 'T' + task.assignedTime).format('h:mm A')}
                                        </span>
                                    )}
                                </div>
                                <div className="task-action">
                                    <CustomCheckbox
                                        checked={task.complete}
                                        onChange={() => onToggleTask(task)}
                                        icon={<RiCheckboxBlankCircleLine className="checkbox_icon_unchecked" />}
                                        checkedIcon={<RiCheckboxCircleFill className="checkbox_icon_checked" />}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-tasks">No tasks for this day.</p>
                )}
            </div>
        </div>
    );
}

export default TaskDetailPanel;
