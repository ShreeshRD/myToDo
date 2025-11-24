'use client'

import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill } from "react-icons/ri";
import { BsArrowRepeat } from "react-icons/bs";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import CustomCheckbox from "./CustomCheckbox";
import '../styles/todoitem.css';
import { useTasks } from "../contexts/TaskContext";
import { formatTaskDate, formatDateShort } from "../lib/dateHelpers";

function ToDoDay({ tasks, date, id }) {
    const { updateTask, removeTask, callPopup, darkMode } = useTasks();
    const title = formatTaskDate(date);

    return (
        <div className="tasks">
            <div className="todo_items_title"><b>{title}</b></div>
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
                                        className={`todo_item_box${darkMode ? ' dark' : ''}${id === 100 ? ' overdue' : ''}`}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        onClick={() => callPopup(date, task)}
                                    >
                                        <div className="todo_item_inner">
                                            <CustomCheckbox
                                                checked={task.complete}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateTask(task.id, "complete", !task.complete, task.taskDate);
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
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {date !== "Overdue" ? (
                            <div className="footer_div">
                                <button className={`tasks_footer${darkMode ? ' dark' : ''}`} onClick={() => callPopup(date)}>
                                    <AddIcon className="add-icon" />
                                    Add task
                                </button>
                            </div>
                        ) : null}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

export default ToDoDay;
