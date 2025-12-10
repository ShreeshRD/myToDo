'use client'

import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill } from "react-icons/ri";
import { BsArrowRepeat } from "react-icons/bs";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import CustomCheckbox from "./CustomCheckbox";
import CustomContextMenu from "./CustomContextMenu";
import '../styles/todoitem.css';
import { useTasks } from "../contexts/TaskContext";
import { useStopwatch } from "../contexts/StopwatchContext";
import { useUI } from "../contexts/UIContext";
import { formatTaskDate, formatDateShort } from "../lib/dateHelpers";

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
            <div className="todo_items_title"><b suppressHydrationWarning>{title}</b></div>
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
                                                    updateTask(task.id, "complete", newComplete, task.taskDate);
                                                }}
                                                icon={<RiCheckboxBlankCircleLine className="checkbox_icon_unchecked" />}
                                                checkedIcon={<RiCheckboxCircleFill className="checkbox_icon_checked" />}
                                            />
                                            <div className="task_label">
                                                <span className={task.complete ? 'strikethrough' : ''}>
                                                    {task.name}
                                                </span>
                                            </div>
                                            <button
                                                className="todo_delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeTask(task.id, task.taskDate);
                                                }}
                                            >
                                                <DeleteIcon className="todo_delete_icon" />
                                            </button>
                                        </div>
                                        <div className="task_infobar">
                                            <span>
                                                {date === "Overdue" && formatDateShort(task.taskDate)}
                                                {task.repeatType !== "NONE" && <BsArrowRepeat className="repeat_icon" />}
                                                {task.category !== 'None' && ` #${task.category}`}
                                                {task.complete && task.timeTaken > 0 && ` • ${Math.floor(task.timeTaken / 60000)}m`}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {date !== "Overdue" ? (
                            <div className="footer_div">
                                <button className={`tasks_footer ${theme}`} onClick={() => callPopup(date)}>
                                    <AddIcon className="add-icon" />
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
