'use client'

import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { BsArrowRepeat } from "react-icons/bs";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { IoNotificationsOutline, IoTimeOutline } from "react-icons/io5";
import CustomCheckbox from "./CustomCheckbox";
import CustomContextMenu from "./CustomContextMenu";
import '../styles/todoitem.css';
import { useTasks } from "../contexts/TaskContext";
import { useStopwatch } from "../contexts/StopwatchContext";
import { useUI } from "../contexts/UIContext";
import { formatTaskDate, formatDateShort } from "../lib/dateHelpers";
import { projectColor } from "../lib/projectColors";
import dayjs from "dayjs";

function ToDoDay({ tasks, date, id }) {
    const { updateTask, removeTask, callPopup } = useTasks();
    const { theme } = useUI();
    const { toggleStopwatch, stopStopwatch } = useStopwatch();
    const title = formatTaskDate(date);
    const [contextMenu, setContextMenu] = React.useState({ visible: false, x: 0, y: 0, task: null });

    const handleContextMenu = (e, task) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            task: task
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleMarkInProgress = () => {
        if (contextMenu.task) {
            updateTask(contextMenu.task.id, "inProgress", !contextMenu.task.inProgress, contextMenu.task.taskDate);
        }
        handleCloseContextMenu();
    };

    const handleToggleLongTerm = () => {
        if (contextMenu.task) {
            updateTask(contextMenu.task.id, "longTerm", !contextMenu.task.longTerm, contextMenu.task.taskDate);
        }
        handleCloseContextMenu();
    };

    const handleEdit = () => {
        if (contextMenu.task) {
            callPopup(date, contextMenu.task);
        }
        handleCloseContextMenu();
    };

    const handleTimeMe = () => {
        if (contextMenu.task) {
            toggleStopwatch(contextMenu.task);
        }
        handleCloseContextMenu();
    };

    const getTaskClassName = (task) => {
        let className = `todo_item_box ${theme}`;
        if (id === 100) className += ' overdue';
        if (task.inProgress) className += ' in-progress';
        if (task.longTerm) className += ' long-term';
        return className;
    };

    return (
        <div className="tasks">
            <div className={`todo_items_title${id === 100 ? ' overdue' : ''}`}>
                <span suppressHydrationWarning>{title}</span>
                {tasks.length > 0 && <span className="todo_items_count">{tasks.filter(t => !t.complete).length || ''}</span>}
            </div>
            <Droppable droppableId={`tasks__list${id}`}>
                {(provided) => (
                    <div
                        className={`task_items`}
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided) => (
                                    <div
                                        className={getTaskClassName(task)}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        onClick={() => !task.complete && callPopup(date, task)}
                                        onContextMenu={(e) => !task.complete && handleContextMenu(e, task)}
                                    >
                                        <div className="todo_item_inner">
                                            <CustomCheckbox
                                                checked={task.complete}
                                                onChange={async (e) => {
                                                    e.stopPropagation();
                                                    const newComplete = !task.complete;
                                                    if (newComplete) {
                                                        // Wait for stopwatch to save timeTaken before marking complete
                                                        await stopStopwatch(task);
                                                    }
                                                    await updateTask(task.id, "complete", newComplete, task.taskDate);
                                                }}
                                                priority={task.priority ?? 0}
                                            />
                                            <div className="task_label">
                                                <span className={task.complete ? 'strikethrough' : ''}>
                                                    {task.name}
                                                </span>
                                            </div>
                                            <button
                                                className="todo_delete"
                                                aria-label="Delete task"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeTask(task.id, task.taskDate);
                                                }}
                                            >
                                                <DeleteIcon className="todo_delete_icon" />
                                            </button>
                                        </div>
                                        <div className="task_infobar">
                                            {date === "Overdue" && (
                                                <span className="task_meta task_meta--overdue">{formatDateShort(task.taskDate)}</span>
                                            )}
                                            {task.assignedTime && !task.complete && (
                                                <span className="task_meta">
                                                    {task.reminderMinutesBefore != null
                                                        ? <IoNotificationsOutline className="task_meta_icon" title="Reminder set" />
                                                        : <IoTimeOutline className="task_meta_icon" />}
                                                    {dayjs(`2000-01-01T${task.assignedTime}`).format('h:mm A')}
                                                </span>
                                            )}
                                            {task.repeatType && task.repeatType !== "NONE" && (
                                                <span className="task_meta"><BsArrowRepeat className="repeat_icon" /></span>
                                            )}
                                            {task.complete && task.timeTaken > 0 && (
                                                <span className="task_meta">{Math.floor(task.timeTaken / 60000)}m</span>
                                            )}
                                            {task.category && task.category !== 'None' && (
                                                <span className="task_meta task_meta--project">
                                                    <span className="task_project_hash" style={{ color: projectColor(task.category) }}>#</span>
                                                    {task.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {date !== "Overdue" ? (
                            <div className="footer_div">
                                <button className={`tasks_footer ${theme}`} onClick={() => callPopup(date)}>
                                    <span className="tasks_footer_icon"><AddIcon className="add-icon" /></span>
                                    Add task
                                </button>
                            </div>
                        ) : null}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            <CustomContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                task={contextMenu.task}
                onClose={handleCloseContextMenu}
                onMarkInProgress={handleMarkInProgress}
                onToggleLongTerm={handleToggleLongTerm}
                onEdit={handleEdit}
                onTimeMe={handleTimeMe}
            />
        </div >
    );
}

export default ToDoDay;
