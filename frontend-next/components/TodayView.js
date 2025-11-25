'use client'

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTasks } from "../contexts/TaskContext";
import dayjs from 'dayjs';
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill } from "react-icons/ri";
import { BsArrowRepeat } from "react-icons/bs";
import DeleteIcon from '@mui/icons-material/Delete';
import CustomCheckbox from "./CustomCheckbox";
import '../styles/todoitem.css';
import '../styles/todayview.scss';

// Generate time slots every 90 minutes from 03:00 to 00:00 (next day)
const generateTimeSlots = () => {
    const slots = [];
    let currentTime = dayjs().hour(0).minute(0).second(0);
    // End at midnight (start of next day)
    const endTime = dayjs().add(1, 'day').hour(0).minute(0).second(0);

    while (currentTime.isBefore(endTime)) {
        slots.push(currentTime.format('HH:mm'));
        currentTime = currentTime.add(90, 'minute');
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

function TodayView() {
    const { taskDays, updateTask, removeTask, callPopup, darkMode } = useTasks();
    const [todayTasks, setTodayTasks] = useState([]);
    const [assignedTasks, setAssignedTasks] = useState({});
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [currentTime, setCurrentTime] = useState(dayjs());

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const today = dayjs().format('YYYY-MM-DD');
        const tasks = taskDays[today] || [];
        
        const unassigned = [];
        const assigned = {};
        const overdue = [];

        // Initialize assigned slots
        TIME_SLOTS.forEach(slot => {
            assigned[slot] = [];
        });

        // Sort tasks by dayOrder
        const sortedTasks = [...tasks].sort((a, b) => a.dayOrder - b.dayOrder);

        sortedTasks.forEach(task => {
            if (task.assignedTime && task.assignedTime !== "null") {
                const timeStr = task.assignedTime.substring(0, 5); // HH:mm
                
                // Check if task is incomplete and in the past (before current time)
                // We need to compare task time with current time.
                // But we only care if it's in a PAST slot?
                // "Any incomplete tasks within that window should move out"
                // The "window" is "sections before [current time]".
                // So if task.assignedTime < currentTime AND !task.complete -> Overdue.
                
                const taskTime = dayjs(`${today}T${task.assignedTime}`);
                
                if (!task.complete && taskTime.isBefore(currentTime)) {
                     overdue.push(task);
                } else {
                    if (assigned[timeStr]) {
                        assigned[timeStr].push(task);
                    } else {
                        // Fallback logic
                        let foundSlot = false;
                        for (let i = TIME_SLOTS.length - 1; i >= 0; i--) {
                            const slotTime = dayjs(`${today}T${TIME_SLOTS[i]}`);
                            // If task time matches slot or is after slot (but before next slot)
                            if (taskTime.isSame(slotTime) || taskTime.isAfter(slotTime)) {
                                if (assigned[TIME_SLOTS[i]]) {
                                    assigned[TIME_SLOTS[i]].push(task);
                                    foundSlot = true;
                                    break;
                                }
                            }
                        }
                        if (!foundSlot) {
                            unassigned.push(task);
                        }
                    }
                }
            } else {
                unassigned.push(task);
            }
        });

        setTodayTasks(unassigned);
        setAssignedTasks(assigned);
        setOverdueTasks(overdue);
    }, [taskDays, currentTime]); // Re-run when currentTime changes to move tasks to overdue

    // Scroll to current time when assignedTasks are ready
    const hasScrolledRef = React.useRef(false);
    // ADJUST THIS VALUE: Positive value moves the line DOWN from the top
    const SCROLL_OFFSET_PX = 30; 

    useEffect(() => {
        // Only scroll if we haven't scrolled yet and tasks are populated (keys exist)
        if (!hasScrolledRef.current && Object.keys(assignedTasks).length > 0) {
            // Small timeout to ensure DOM is ready after state update
            const timer = setTimeout(() => {
                const timeLineElement = document.querySelector('.current-time-line');
                const scrollContainer = document.querySelector('.schedule-column');

                if (timeLineElement && scrollContainer) {
                    // Calculate position relative to container
                    const lineRect = timeLineElement.getBoundingClientRect();
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const relativeTop = lineRect.top - containerRect.top;
                    
                    // Scroll so the line is SCROLL_OFFSET_PX from the top
                    scrollContainer.scrollTo({
                        top: scrollContainer.scrollTop + relativeTop - SCROLL_OFFSET_PX,
                        behavior: 'smooth'
                    });

                    hasScrolledRef.current = true;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [assignedTasks]);

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const taskId = draggableId;
        const today = dayjs().format('YYYY-MM-DD');

        // 1. Optimistic Update
        const newTodayTasks = [...todayTasks];
        const newAssignedTasks = { ...assignedTasks };
        const newOverdueTasks = [...overdueTasks];

        let sourceList, destList;

        // Identify source list
        if (source.droppableId === 'unassigned') {
            sourceList = newTodayTasks;
        } else if (source.droppableId === 'overdue') {
            sourceList = newOverdueTasks;
        } else {
            sourceList = newAssignedTasks[source.droppableId];
        }

        // Identify destination list
        if (destination.droppableId === 'unassigned') {
            destList = source.droppableId === 'unassigned' ? newTodayTasks : newTodayTasks;
        } else if (destination.droppableId === 'overdue') {
             destList = source.droppableId === 'overdue' ? newOverdueTasks : newOverdueTasks;
        } else {
            if (source.droppableId === destination.droppableId) {
                destList = sourceList;
            } else {
                destList = newAssignedTasks[destination.droppableId];
            }
        }

        // Remove from source
        const [movedTask] = sourceList.splice(source.index, 1);

        // Update task properties
        if (destination.droppableId !== 'unassigned' && destination.droppableId !== 'overdue') {
            movedTask.assignedTime = destination.droppableId + ":00";
        } else {
            movedTask.assignedTime = null;
        }

        // Add to destination
        destList.splice(destination.index, 0, movedTask);

        setTodayTasks(newTodayTasks);
        setAssignedTasks(newAssignedTasks);
        setOverdueTasks(newOverdueTasks);

        // 2. Persist Changes
        updateTask(parseInt(taskId), "assignedTime", movedTask.assignedTime ? movedTask.assignedTime : "null", today);

        // 3. Persist Order
        let currentOrder = 1;
        
        // Overdue tasks first? Or Unassigned? Usually Overdue is top priority.
        newOverdueTasks.forEach(task => {
             if (task.dayOrder !== currentOrder) {
                updateTask(task.id, "dayOrder", currentOrder, today);
                task.dayOrder = currentOrder;
            }
            currentOrder++;
        });

        newTodayTasks.forEach(task => {
            if (task.dayOrder !== currentOrder) {
                updateTask(task.id, "dayOrder", currentOrder, today);
                task.dayOrder = currentOrder;
            }
            currentOrder++;
        });

        TIME_SLOTS.forEach(slot => {
            if (newAssignedTasks[slot]) {
                newAssignedTasks[slot].forEach(task => {
                    if (task.dayOrder !== currentOrder) {
                        updateTask(task.id, "dayOrder", currentOrder, today);
                        task.dayOrder = currentOrder;
                    }
                    currentOrder++;
                });
            }
        });
    };

    const renderTask = (task, index) => (
        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
            {(provided) => (
                <div
                    className={`todo_item_box${darkMode ? ' dark' : ''}`}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    onClick={() => !task.complete && callPopup(dayjs().format('YYYY-MM-DD'), task)}
                    style={{ ...provided.draggableProps.style, marginBottom: '8px' }}
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
                </div>
            )}
        </Draggable>
    );

    // Helper to determine if a slot is in the past
    const isSlotInPast = (slot) => {
        const today = dayjs().format('YYYY-MM-DD');
        const slotTime = dayjs(`${today}T${slot}`);
        // Slot is 90 mins. If current time is past the END of the slot? 
        // Or if current time is past the START?
        // "Sections before it should be covered by a dark window"
        // Usually means fully past slots.
        // If current time is 10:00. 09:00 slot (ends 10:30) is current.
        // 07:30 slot (ends 09:00) is past.
        const slotEndTime = slotTime.add(90, 'minute');
        return currentTime.isAfter(slotEndTime);
    };

    // Helper to calculate current time line position
    const getCurrentTimeLineStyle = (slot) => {
        const today = dayjs().format('YYYY-MM-DD');
        const slotTime = dayjs(`${today}T${slot}`);
        const slotEndTime = slotTime.add(90, 'minute');
        
        if (currentTime.isAfter(slotTime) && currentTime.isBefore(slotEndTime)) {
            // Calculate percentage
            const diff = currentTime.diff(slotTime, 'minute');
            const percentage = (diff / 90) * 100;
            return { top: `${percentage}%` };
        }
        return null;
    };

    return (
        <div className={`today-view${darkMode ? ' dark' : ''}`}>
            <DragDropContext onDragEnd={onDragEnd}>
                {/* Tasks Column */}
                <div className="tasks-column">
                    
                    {/* Overdue Section */}
                    {overdueTasks.length > 0 && (
                        <div className="overdue-section">
                            <h3>Overdue</h3>
                            <Droppable droppableId="overdue">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="overdue-list"
                                    >
                                        {overdueTasks.map((task, index) => renderTask(task, index))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )}

                    {/* Unassigned Tasks */}
                    <div className="unassigned-section">
                        <h3>Tasks</h3>
                        <Droppable droppableId="unassigned">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="unassigned-list"
                                >
                                    {todayTasks.map((task, index) => renderTask(task, index))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>

                {/* Schedule Column */}
                <div className="schedule-column">
                    <h3>Schedule</h3>
                    <div className="slots-container">
                        {TIME_SLOTS.map((slot) => {
                            const isPast = isSlotInPast(slot);
                            const lineStyle = getCurrentTimeLineStyle(slot);
                            const hasTasks = assignedTasks[slot] && assignedTasks[slot].length > 0;

                            // Hide past slots if they have no tasks
                            if (isPast && !hasTasks) {
                                return null;
                            }
                            
                            return (
                                <div key={slot} className="time-slot">
                                    <div className="slot-label">
                                        {slot}
                                    </div>
                                    <Droppable droppableId={slot}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`slot-droppable${snapshot.isDraggingOver ? ' dragging-over' : ''}${isPast ? ' past' : ''}`}
                                            >
                                                {/* Dark Window Overlay for Past Slots? 
                                                    Actually setting background color and opacity above works well.
                                                    But user asked for "dark window". 
                                                    If it's the current slot, we need to darken BEFORE the line.
                                                */}
                                                
                                                {lineStyle && (
                                                    <>
                                                        {/* Darken area before line */}
                                                        <div className="dark-overlay" style={{ height: lineStyle.top }} />
                                                        {/* The Line */}
                                                        <div className="current-time-line" style={{ top: lineStyle.top }} />
                                                    </>
                                                )}
                                                
                                                {/* Content */}
                                                <div className="slot-content">
                                                    {assignedTasks[slot] && assignedTasks[slot].map((task, index) => renderTask(task, index))}
                                                </div>
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}

export default TodayView;
