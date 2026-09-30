'use client'

import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import Dropdown from "./Dropdown";
import DateComponent from "./DateComponent";
import TimeComponent from "./TimeComponent";
import { IoNotificationsOutline } from "react-icons/io5";
import { REMINDER_OPTIONS, reminderLabel } from "../lib/reminders";

const REMINDER_CHIP_LABELS = { 0: 'At time', 5: '5m before', 10: '10m before', 15: '15m before', 30: '30m before', 60: '1h before', 1440: '1d before' };
import CustomCheckbox from "./CustomCheckbox";
import { FaRegCircle, FaCircle, FaFlag } from "react-icons/fa";
import { BsArrowRepeat } from "react-icons/bs";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import '../styles/popup.scss'
import { useTasks } from "../contexts/TaskContext";
import { projectColor } from "../lib/projectColors";
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

function CreateTaskPopup({ projects, theme, date, task }) {
  const { onPopupClose } = useTasks();
  const inputRef = useRef(null);

  // When editing a task, use its actual taskDate; otherwise use the provided date
  const getInitialDate = () => {
    if (task && task.taskDate) {
      return dayjs(task.taskDate);
    }
    // For "Overdue" or any invalid date string, fallback to today
    if (date && dayjs(date).isValid()) {
      return dayjs(date);
    }
    return dayjs();
  };
  const initialDate = getInitialDate();

  const [poptype, setPoptype] = useState("Add Task");
  const [taskName, setTaskName] = useState('');
  const [taskID, setTaskID] = useState(-1);
  const [taskDate, setTaskDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedProject, setSelectedProject] = useState('Project');
  const [selectedPriority, setSelectedPriority] = useState('P0');
  const [repeatType, setRepeatType] = useState("Repeat Type");
  const [repeatDuration, setRepeatDuration] = useState('');
  const [repeatCustom, setRepeatCustom] = useState(1);
  const [assignedTime, setAssignedTime] = useState(null);
  const [reminder, setReminder] = useState(null); // minutes before assignedTime, null = none
  const [error, setError] = useState('');
  const [days, setDays] = useState([...WEEKDAYS]);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setReminder(task.reminderMinutesBefore ?? null);
    }
  }, [task]);

  const createTask = async () => {
    const formattedDate = selectedDate.format('YYYY-MM-DD');
    const projectToPass = selectedProject === 'Project' ? 'None' : selectedProject;
    const priorityValue = getPriorityValue(selectedPriority, PRIORITY_MAP);
    const repeatTypeValue = getRepeatTypeValue(repeatType, REPEAT_TYPE_MAP);
    const repeatDurationInt = getRepeatDuration(repeatTypeValue, repeatDuration, repeatCustom);
    const timeToPass = assignedTime ? assignedTime.format('HH:mm:ss') : null;
    const inProgress = task?.inProgress || false;
    const timeTaken = task?.timeTaken || 0;
    const longTerm = task?.longTerm || false;

    const reminderToPass = timeToPass ? reminder : null;

    onPopupClose(taskID, taskDate, taskName, formattedDate, projectToPass, priorityValue, repeatTypeValue, repeatDurationInt, order, timeToPass, inProgress, timeTaken, longTerm, reminderToPass);
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

  const handleClosePopup = React.useCallback(() => {
    onPopupClose();
  }, [onPopupClose]);

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      createTask();
    } else if (event.key === 'Escape') {
      handleClosePopup();
    }
  };

  const handleProjectSelect = (event) => {
    const selectedValue = event.target.textContent;
    // If "None" is selected, reset to "Project" placeholder
    setSelectedProject(selectedValue === 'None' ? 'Project' : selectedValue);
  };

  const handlePrioritySelect = (event) => {
    setSelectedPriority(event.target.textContent);
  };

  const handleRepeatTypeSelect = (event) => {
    setRepeatType(event.target.textContent);
  };

  const handleTimeChange = (newTime) => {
    setAssignedTime(newTime);
    if (!newTime) setReminder(null);
  };

  const handleReminderSelect = (e) => {
    const option = REMINDER_OPTIONS.find(o => o.label === e.target.textContent);
    setReminder(option ? option.value : null);
  };

  const hasReminder = reminder !== null;
  const getReminderLabel = () => (
    <>
      <IoNotificationsOutline style={{ color: hasReminder ? 'var(--accent)' : 'var(--text-3)' }} />
      {hasReminder && <span>{REMINDER_CHIP_LABELS[reminder] ?? `${reminder}m before`}</span>}
    </>
  );

  const handleDurationChange = (event) => {
    const value = event.target.value;
    if (value === '' || (Number(value) >= 1 && Number(value) <= 30)) {
      setRepeatDuration(value);
      setError('');
    } else {
      setError('Please enter a number between 1 and 30');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const taskPopupElement = document.querySelector('.taskPopup');
      if (taskPopupElement && taskPopupElement === event.target) {
        handleClosePopup();
      }
    };

    if (inputRef.current) inputRef.current.focus();
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClosePopup]);

  const priorityNumber = String(selectedPriority).replace('P', '');
  const hasPriority = selectedPriority !== 'P0';
  const hasProject = selectedProject !== 'Project';
  const hasRepeat = repeatType !== 'Repeat Type' && repeatType !== 'Off';

  const getPriorityIcon = () => (
    <>
      <FaFlag
        className="chip-flag"
        style={{ color: hasPriority ? `var(--p${priorityNumber})` : 'var(--text-3)' }}
      />
      {hasPriority && <span>P{priorityNumber}</span>}
    </>
  );

  const getProjectLabel = () => (
    <>
      <span className="chip-hash" style={{ color: hasProject ? projectColor(selectedProject) : 'var(--text-3)' }}>#</span>
      <span>{hasProject ? selectedProject : 'Project'}</span>
    </>
  );

  const REPEAT_CHIP_LABELS = {
    'Every X Days': 'Daily',
    'Every X Weeks': 'Weekly',
    'Every X Months': 'Monthly',
    'Specific Weekdays': 'Weekdays',
  };

  const getRepeatIcon = () => (
    <>
      <BsArrowRepeat style={{ color: hasRepeat ? 'var(--accent)' : 'var(--text-3)' }} />
      {hasRepeat && <span>{REPEAT_CHIP_LABELS[repeatType] || repeatType}</span>}
    </>
  );

  return (
    <div className={`taskPopup ${theme}`}>
      <div className={`createTask ${theme}`} role="dialog" aria-modal="true" aria-label={poptype === "Update" ? "Edit task" : "New task"}>
        <div className="task-text">
          <textarea
            className="no-background"
            placeholder="Task Name"
            value={taskName}
            onChange={handleTaskNameChange}
            onKeyDown={handleInputKeyDown}
            ref={inputRef}
            rows={2}
            maxLength={255}
          />
          <div className="char-counter">
            {taskName.length}/255
          </div>
        </div>
        {/* Chip row: date · time · reminder (only once a time is set) · project · priority · repeat */}
        <div className="task-options">
          <div className="date-nav-arrows">
            <IoIosArrowBack className="date-btns" aria-label="Previous day" onClick={() => setSelectedDate((prevDate) => prevDate.subtract(1, 'day'))} />
            <DateComponent selectedDate={selectedDate} handler={handleDateChange} theme={theme} location="popup" />
            <IoIosArrowForward className="date-btns" aria-label="Next day" onClick={() => setSelectedDate((prevDate) => prevDate.add(1, 'day'))} />
          </div>
          <TimeComponent selectedTime={assignedTime} handler={handleTimeChange} theme={theme} />
          {assignedTime && (
            <Dropdown
              placeholder={getReminderLabel()}
              items={REMINDER_OPTIONS.map(o => o.label)}
              handler={handleReminderSelect}
              selected={reminderLabel(reminder)}
              isSet={hasReminder}
              ariaLabel="Reminder"
            />
          )}
          <Dropdown placeholder={getProjectLabel()} items={['None', ...projects]} handler={handleProjectSelect} selected={hasProject ? selectedProject : 'None'} isSet={hasProject} ariaLabel="Project" />
          <Dropdown placeholder={getPriorityIcon()} items={PRIORITIES} handler={handlePrioritySelect} selected={selectedPriority} isSet={hasPriority} ariaLabel="Priority" />
          <Dropdown placeholder={getRepeatIcon()} items={REPEAT_OPTIONS} handler={handleRepeatTypeSelect} selected={repeatType} isSet={hasRepeat} ariaLabel="Repeat" />

          {repeatType !== "Repeat Type" && repeatType !== "Off" && repeatType !== "Specific Weekdays" && (
            <div className="repeat-extra">
              <span>Every</span>
              <input
                type="text"
                className="no-background repeat-duration"
                placeholder="Duration"
                value={repeatDuration}
                onChange={handleDurationChange}
              />
              <span>{repeatType.replace('Every X ', '').toLowerCase()}</span>
            </div>
          )}
          {repeatType === "Specific Weekdays" && (<div className="repeat-extra">
            <span>On</span>
            <div className="weekday-picker">
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
            </div>
          </div>)}
        </div>
        <div className="bottom-btns">
          {error && <p className="myerror">{error}</p>}
          <button
            className={`btn cancel-btn ${theme}`}
            onClick={handleClosePopup}
          >
            Cancel
          </button>
          <button onClick={createTask} className="btn btn-primary add-btn" data-testid="add-task-btn">{poptype === "Update" ? "Save" : "Add task"}</button>
        </div>
      </div>
    </div>
  )
}

export default CreateTaskPopup;
