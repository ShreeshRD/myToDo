import React from "react";
import ToDoDay from "./components/ToDoDay";
import { DragDropContext } from "@hello-pangea/dnd";

function Upcoming({ showPopup, darkMode, callPapaPopup, updateTask, removeTask, handleDragEnd, taskDays, overdueTasks, startDate }) {
    const dates = Array.from({ length: 7 }, (_, index) => {
        const date = startDate.add(index, 'day');
        return date.format('YYYY-MM-DD');
    });

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className={`weekItems ${showPopup ? 'inactive' : ''}`}>
                {dates.map((date, index) => {
                    const tasks = taskDays[date] || [];
                    const sortedTasks = tasks.sort((a, b) => a.dayOrder - b.dayOrder);
                    return (
                        <ToDoDay
                            key={index}
                            id={index}
                            date={date}
                            tasks={sortedTasks}
                            updateTask={updateTask}
                            delTask={removeTask}
                            callPop={callPapaPopup}
                            darkmode={darkMode}
                        />
                    );
                })}
            </div>
        </DragDropContext>
    )
}

export default Upcoming