'use client'

import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import Dropdown from "./Dropdown";
import DateComponent from "./DateComponent";
import TimeComponent from "./TimeComponent";
import CustomCheckbox from "./CustomCheckbox";
import { FaRegCircle, FaCircle, FaFlag } from "react-icons/fa";
import { BsArrowRepeat } from "react-icons/bs";
import '../styles/popup.scss'
import { useTasks } from "../contexts/TaskContext";
import {
  PRIORITY_MAP,
  REPEAT_TYPE_MAP,
  PRIORITIES,
  REPEAT_OPTIONS,
  WEEKDAYS
} from '../lib/constants';
import {
  formatRepeatType,
  processCustomRepeat,
  getPriorityValue,
  getRepeatTypeValue,
  getRepeatDuration
} from '../lib/taskHelpers';

function CreateTaskPopup({ projects, darkmode, date, task }) {
  const { onPopupClose } = useTasks();
  const inputRef = useRef(null);

  const initialDate = date ? dayjs(date) : dayjs();

  const [poptype, setPoptype] = useState("Add Task");
  const [taskName, setTaskName] = useState('');
  const [taskID, setTaskID] = useState(-1);
  const [taskDate, setTaskDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedProject, setSelectedProject] = useState('Project');
  const [selectedPriority, setSelectedPriority] = useState('Priority');
  const [repeatType, setRepeatType] = useState("Repeat Type");
  const [repeatDuration, setRepeatDuration] = useState('');
  const [repeatCustom, setRepeatCustom] = useState(1);
  const [assignedTime, setAssignedTime] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState([...WEEKDAYS]);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (task) {
      setPoptype("Update");
      setTaskName(task.name);
      setTaskID(task.id);
      setTaskDate(task.taskDate);
      setSelectedProject(task.category === "None" ? 'Project' : task.category);
      setSelectedPriority(`P${task.priority}`);
      setRepeatType(task.repeatType !== "NONE" ? formatRepeatType(task.repeatType) : 'Repeat Type');
      setRepeatCustom(task.repeatType === "SPECIFIC_WEEKDAYS" ? task.repeatDuration : 1);
      setDays(task.repeatType === "SPECIFIC_WEEKDAYS" ? processCustomRepeat(task.repeatDuration, [...WEEKDAYS]) : [...WEEKDAYS]);
      setRepeatDuration(task.repeatType === "SPECIFIC_WEEKDAYS" ? '' : (task.repeatDuration === 0 ? '' : task.repeatDuration));
      setOrder(task.dayOrder);
      setAssignedTime(task.assignedTime && task.assignedTime !== "null" ? dayjs(`${task.taskDate}T${task.assignedTime}`) : null);
    }
  }, [task]);

  const createTask = async () => {
    const formattedDate = selectedDate.format('YYYY-MM-DD');
    const projectToPass = selectedProject === 'Project' ? 'None' : selectedProject;
    const priorityValue = getPriorityValue(selectedPriority, PRIORITY_MAP);
    const repeatTypeValue = getRepeatTypeValue(repeatType, REPEAT_TYPE_MAP);
    const repeatDurationInt = getRepeatDuration(repeatTypeValue, repeatDuration, repeatCustom);
    const timeToPass = assignedTime ? assignedTime.format('HH:mm:ss') : null;

    onPopupClose(taskID, taskDate, taskName, formattedDate, projectToPass, priorityValue, repeatTypeValue, repeatDurationInt, order, timeToPass);
    setTaskName('');
    setSelectedDate(dayjs());
  };

  const handleDayChange = (index) => {
    setDays((prevDays) => {
      const updatedDays = prevDays.map((day, i) =>
        i === index ? { ...day, checked: !day.checked } : day
      );
      const newVal = repeatCustom + (prevDays[index].checked ? -1 : 1) * 2 ** (6 - index);
      setRepeatCustom(newVal);
      return updatedDays;
    });
  };

  const handleTaskNameChange = (e) => {
    setTaskName(e.target.value);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleClosePopup = () => {
    onPopupClose();
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      createTask();
    } else if (event.key === 'Escape') {
      handleClosePopup();
    }
  };

  const handleProjectSelect = (event) => {
    setSelectedProject(event.target.textContent);
  };

  const handlePrioritySelect = (event) => {
    setSelectedPriority(event.target.textContent);
  };

  const handleRepeatTypeSelect = (event) => {
    setRepeatType(event.target.textContent);
  };

  const handleTimeChange = (newTime) => {
    setAssignedTime(newTime);
  };

  const handleDurationChange = (event) => {
    const value = event.target.value;
    if (value === '' || (Number(value) >= 1 && Number(value) <= 30)) {
      setRepeatDuration(value);
      setError('');
    } else {
      setError('Please enter a number between 1 and 30');
    }
  };

  const handleClickOutside = (event) => {
    const taskPopupElement = document.querySelector('.taskPopup');
    if (taskPopupElement && taskPopupElement === event.target) {
      handleClosePopup();
    }
  };

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPriorityIcon = () => {
    let color = 'inherit';
    if (selectedPriority === 'P1') color = '#d1453b';
    if (selectedPriority === 'P2') color = '#eb8909';
    if (selectedPriority === 'P3') color = '#246fe0';
    if (selectedPriority === 'P4') color = 'grey';
    return <FaFlag style={{ color, fontSize: '1.2rem' }} />;
  };

  const getRepeatIcon = () => {
    return <BsArrowRepeat style={{ color: 'white', fontSize: '1.5rem' }} />;
  };

  return (
    <div className="taskPopup">
      <div className={`createTask${darkmode ? ' dark' : ''}`}>
        <div className="date-component">
          <DateComponent selectedDate={selectedDate} handler={handleDateChange} darkmode={false} />
        </div>
        <div className="task-text">
          <textarea
            className="no-background"
            placeholder="Task Name"
            value={taskName}
            onChange={handleTaskNameChange}
            onKeyDown={handleInputKeyDown}
            ref={inputRef}
            rows={3}
            maxLength={255}
          />
          <div className="char-counter">
            {taskName.length}/255
          </div>
        </div>
        <div className="task-options">
          <Dropdown placeholder={selectedProject} items={projects} handler={handleProjectSelect} />
          <div className="split-dropdowns">
             <Dropdown placeholder={getPriorityIcon()} items={PRIORITIES} handler={handlePrioritySelect} />
             <Dropdown placeholder={getRepeatIcon()} items={REPEAT_OPTIONS} handler={handleRepeatTypeSelect} />
          </div>
          <TimeComponent selectedTime={assignedTime} handler={handleTimeChange} darkmode={darkmode} />
          
          {repeatType !== "Repeat Type" && repeatType !== "Off" && repeatType !== "Specific Weekdays" && (
            <input
              type="text"
              className="no-background"
              placeholder="Duration"
              value={repeatDuration}
              onChange={handleDurationChange}
            />
          )}
          {repeatType === "Specific Weekdays" && (<div className="weekday-picker">
            {days.map((day, index) => (
              <CustomCheckbox
                key={day.day}
                checked={day.checked}
                onChange={() => { handleDayChange(index); }}
                icon={<FaRegCircle className="checkbox_icon_unchecked" />}
                checkedIcon={<FaCircle className="checkbox_icon_checked" />}
                letter={day.day[0]}
              />
            ))}
          </div>)}
        </div>
        <div className="bottom-btns">
          <button
            className={`btn cancel-btn${darkmode ? ' dark' : ''}`}
            onClick={handleClosePopup}
          >
            Cancel
          </button>
          <button onClick={createTask} className="btn btn-primary add-btn" data-testid="add-task-btn">{poptype}</button>
        </div>
        {error && <p className="myerror">{error}</p>}
      </div>
    </div>
  )
}

export default CreateTaskPopup;
