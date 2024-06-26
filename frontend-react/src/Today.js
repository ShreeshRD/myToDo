import React from "react";
import ToDoDay from "./components/ToDoDay";
import { DragDropContext } from "@hello-pangea/dnd";

function Today({ showPopup, darkMode, callPapaPopup, updateTask, removeTask, handleDragEnd, taskDays, overdueTasks, startDate }) {
    const date = startDate.format('YYYY-MM-DD');
    const tasks = taskDays[date] || [];
    const sortedTasks = tasks.sort((a, b) => a.dayOrder - b.dayOrder);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className={`weekItems ${showPopup ? 'inactive' : ''}`}>
                {overdueTasks.overdue.length > 0 && (
                    <ToDoDay
                        key={-1}
                        id={100}
                        date="Overdue"
                        tasks={overdueTasks.overdue}
                        updateTask={updateTask}
                        delTask={removeTask}
                        callPop={callPapaPopup}
                        darkmode={darkMode}
                    />
                )}
                <ToDoDay
                    key={0}
                    id={0}
                    date={date}
                    tasks={sortedTasks}
                    updateTask={updateTask}
                    delTask={removeTask}
                    callPop={callPapaPopup}
                    darkmode={darkMode}
                />
            </div>
        </DragDropContext>
    )
}

export default Today