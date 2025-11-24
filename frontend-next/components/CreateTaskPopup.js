'use client'

import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import Dropdown from "./Dropdown";
import DateComponent from "./DateComponent";
import CustomCheckbox from "./CustomCheckbox";
import { FaRegCircle, FaCircle } from "react-icons/fa";
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
    }
  }, [task]);

  const createTask = async () => {
    const formattedDate = selectedDate.format('YYYY-MM-DD');
    const projectToPass = selectedProject === 'Project' ? 'None' : selectedProject;
    const priorityValue = getPriorityValue(selectedPriority, PRIORITY_MAP);
    const repeatTypeValue = getRepeatTypeValue(repeatType, REPEAT_TYPE_MAP);
    const repeatDurationInt = getRepeatDuration(repeatTypeValue, repeatDuration, repeatCustom);

    onPopupClose(taskID, taskDate, taskName, formattedDate, projectToPass, priorityValue, repeatTypeValue, repeatDurationInt, order);
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
    if (event.key === 'Enter') {
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

  return (
    <div className="taskPopup">
      <div className={`createTask${darkmode ? ' dark' : ''}`}>
        <div className="date-component">
          <DateComponent selectedDate={selectedDate} handler={handleDateChange} darkmode={darkmode} />
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
          />
        </div>
        <div className="task-options">
          <Dropdown placeholder={selectedProject} items={projects} handler={handleProjectSelect} />
          <Dropdown placeholder={selectedPriority} items={PRIORITIES} handler={handlePrioritySelect} />
          <Dropdown placeholder={repeatType} items={REPEAT_OPTIONS} handler={handleRepeatTypeSelect} />
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
