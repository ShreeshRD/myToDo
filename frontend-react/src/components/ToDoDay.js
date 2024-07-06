import React, { Component } from "react";
import PropTypes from "prop-types";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill } from "react-icons/ri";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import CustomCheckbox from "./CustomCheckbox";

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

        return (
            <div className="tasks">
                <b className="todo_item">{title}</b>
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
                                            className={`todo_item rounded_box${this.props.darkmode ? ' dark' : ''}${id === 100 ? ' overdue' : ''}`}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            ref={provided.innerRef}
                                        >
                                            <CustomCheckbox
                                                checked={task.complete}
                                                onChange={() => this.props.updateTask(task.id, "complete", !task.complete, task.taskDate)}
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
                                                onClick={() => this.props.delTask(task.id, task.taskDate)}
                                            >
                                                <DeleteIcon className="todo_delete_icon" />
                                            </button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {this.props.date !== "Overdue" ? (
                                <div className="todo_item">
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