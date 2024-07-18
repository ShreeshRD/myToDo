import React, { Component } from "react";
import PropTypes from "prop-types";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill } from "react-icons/ri";
import { BsArrowRepeat } from "react-icons/bs";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import CustomCheckbox from "./CustomCheckbox";
import './todoitem.css';

export default class ToDoDay extends Component {
    render() {
        const { tasks, date, id } = this.props;
        let title = date;
        if (date !== "Overdue") {
            const dateObject = new Date(date);
            const formattedDate = dateObject.toLocaleString("default", { day: "numeric", weekday: "short" });
            // Check if the date is today or tomorrow
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            const isToday = dateObject.toDateString() === today.toDateString();
            const isTomorrow = dateObject.toDateString() === tomorrow.toDateString();

            const suffix = isToday ? " ‧ Today" : isTomorrow ? " ‧ Tomorrow" : "";
            title = formattedDate + suffix;
        }

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            return `${day} ${month}`;
        };

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
                                            className={`todo_item_box${this.props.darkmode ? ' dark' : ''}${id === 100 ? ' overdue' : ''}`}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            ref={provided.innerRef}
                                            onClick={() => this.props.callPop(this.props.date, task)}
                                        >
                                            <div className="todo_item_inner">
                                                <CustomCheckbox
                                                    checked={task.complete}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        this.props.updateTask(task.id, "complete", !task.complete, task.taskDate);
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
                                                        this.props.delTask(task.id, task.taskDate);
                                                    }}
                                                >
                                                    <DeleteIcon className="todo_delete_icon" />
                                                </button>
                                            </div>
                                            <div className="task_infobar">
                                                <span>
                                                    {this.props.date === "Overdue" && formatDate(task.taskDate)}
                                                    {task.repeatType !== "NONE" && <BsArrowRepeat className="repeat_icon" />}
                                                    {task.category !== 'None' && ` #${task.category}`}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {this.props.date !== "Overdue" ? (
                                <div className="footer_div">
                                    <button className={`tasks_footer${this.props.darkmode ? ' dark' : ''}`} onClick={() => this.props.callPop(this.props.date)}>
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
}

ToDoDay.propTypes = {
    id: PropTypes.number,
    tasks: PropTypes.array,
    date: PropTypes.string,
    updateTask: PropTypes.func,
    delTask: PropTypes.func,
    callPop: PropTypes.func,
    darkmode: PropTypes.bool,
};