import React, { Component } from "react";
import dayjs from "dayjs";
import Dropdown from "./Dropdown";
import DateComponent from "./DateComponent";
import CustomCheckbox from "./CustomCheckbox";
import { FaRegCircle, FaCircle } from "react-icons/fa";
import './popup.scss'

export default class CreateTaskPopup extends Component {
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    const initialDate = props.date
      ? dayjs(props.date)
      : dayjs();
    let initialState = {
      poptype: "Add Task",
      taskName: '',
      taskID: -1,
      taskDate: initialDate,
      selectedDate: initialDate,
      selectedProject: 'Project',
      selectedPriority: 'Priority',
      priorities: ["P0", "P1", "P2", "P3", "P4"],
      repeatType: "Repeat Type",
      repeatOptions: ["Off", "Every X Days", "Every X Weeks", "Every X Months", "Specific Weekdays"],
      repeatDuration: '',
      repeatCustom: 1,
      error: '',
      days: [
        { day: 'Monday', checked: false },
        { day: 'Tuesday', checked: false },
        { day: 'Wednesday', checked: false },
        { day: 'Thursday', checked: false },
        { day: 'Friday', checked: false },
        { day: 'Saturday', checked: false },
        { day: 'Sunday', checked: false },
      ],
      order: 0,
    };

    if (props.task) {
      const task = props.task;
      initialState = {
        ...initialState,
        poptype: "Update",
        taskName: task.name,
        taskID: task.id,
        taskDate: task.taskDate,
        selectedProject: task.category === "None" ? initialState.selectedProject : task.category,
        selectedPriority: `P${task.priority}`,
        repeatType: task.repeatType !== "NONE" ? this.formatRepeatType(task.repeatType) : initialState.repeatType,
        repeatCustom: task.repeatType === "SPECIFIC_WEEKDAYS" ? task.repeatDuration : initialState.repeatCustom,
        days: task.repeatType === "SPECIFIC_WEEKDAYS" ? this.processCustomRepeat(task.repeatDuration, initialState.days) : initialState.days,
        repeatDuration: task.repeatType === "SPECIFIC_WEEKDAYS" ? '' : task.repeatDuration,
        order: task.dayOrder,
      };
    }

    this.state = initialState;
  }

  formatRepeatType(repeatType) {
    return repeatType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  processCustomRepeat(repeatVal, days) {
    const binaryString = repeatVal.toString(2).padStart(7, '0');
    const updatedDays = days.map((day, index) => ({
      ...day,
      checked: binaryString[index] === '1'
    }));
    return updatedDays;
  }

  createTask = async () => {
    const { taskID, taskDate, taskName, selectedDate, selectedProject, selectedPriority, repeatType, repeatDuration, repeatCustom, order } = this.state;
    const formattedDate = selectedDate.format('YYYY-MM-DD');
    const projectToPass = selectedProject === 'Project' ? 'None' : selectedProject;
    const priorityMap = {
      'Priority': 0,
      'P0': 0,
      'P1': 1,
      'P2': 2,
      'P3': 3,
      'P4': 4
    };
    let priorityValue = priorityMap[selectedPriority];
    const repeatMap = {
      'Repeat Type': 'NONE',
      'Off': 'NONE',
      'Every X Days': 'EVERY_X_DAYS',
      'Every X Weeks': 'EVERY_X_WEEKS',
      'Every X Months': 'EVERY_X_MONTHS',
      'Specific Weekdays': 'SPECIFIC_WEEKDAYS'
    };
    let repeatTypeValue = repeatMap[repeatType];
    let repeatDurationInt = repeatTypeValue === 'NONE' ? 0 : repeatDuration === '' ? 1 : parseInt(repeatDuration, 10);
    repeatDurationInt = repeatTypeValue === 'SPECIFIC_WEEKDAYS' ? repeatCustom : repeatDurationInt;
    this.props.onPopupClose(taskID, taskDate, taskName, formattedDate, projectToPass, priorityValue, repeatTypeValue, repeatDurationInt, order);
    this.props.setTrigger(false);
    this.setState({ taskName: '', selectedDate: dayjs() });
  };

  handleDayChange = (index) => {
    this.setState((prevState) => {
      const updatedDays = prevState.days.map((day, i) =>
        i === index ? { ...day, checked: !day.checked } : day
      );
      const newVal = prevState.repeatCustom + (prevState.days[index].checked ? -1 : 1) * 2 ** (6 - index);
      return {
        days: updatedDays,
        repeatCustom: newVal,
      };
    });
  };

  handleTaskNameChange = (e) => {
    this.setState({ taskName: e.target.value });
  };

  handleDateChange = (newDate) => {
    this.setState({ selectedDate: newDate });
  };

  handleClosePopup = () => {
    this.props.onPopupClose();
    this.props.setTrigger(false);
  }

  handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.createTask();
    } else if (event.key === 'Escape') {
      this.handleClosePopup();
    }
  };

  handleProjectSelect = (event) => {
    this.setState({ selectedProject: event.target.textContent });
  };

  handlePrioritySelect = (event) => {
    this.setState({ selectedPriority: event.target.textContent });
  };

  handleRepeatTypeSelect = (event) => {
    this.setState({ repeatType: event.target.textContent });
  };

  handleDurationChange = (event) => {
    const value = event.target.value;
    if (value === '' || (Number(value) >= 1 && Number(value) <= 30)) {
      this.setState({ repeatDuration: value, error: '' });
    } else {
      this.setState({ error: 'Please enter a number between 1 and 30' });
    }
  };
  handleClickOutside = (event) => {
    const taskPopupElement = document.querySelector('.taskPopup');
    if (taskPopupElement && taskPopupElement === event.target) {
      this.handleClosePopup();
    }
  };

  componentDidMount() {
    this.inputRef.current.focus();
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  render() {
    return (
      <div className="taskPopup">
        <div className={`createTask${this.props.darkmode ? ' dark' : ''}`}>
          <div className="date-component">
            <DateComponent selectedDate={this.state.selectedDate} handler={this.handleDateChange} />
          </div>
          <div className="task-text">
            <input
              type="text"
              className="no-background"
              placeholder="Task Name"
              value={this.state.taskName}
              onChange={this.handleTaskNameChange}
              onKeyDown={this.handleInputKeyDown}
              ref={this.inputRef}
            />
          </div>
          <div className="task-options">
            <Dropdown placeholder={this.state.selectedProject} items={this.props.projects} handler={this.handleProjectSelect} />
            <Dropdown placeholder={this.state.selectedPriority} items={this.state.priorities} handler={this.handlePrioritySelect} />
            <Dropdown placeholder={this.state.repeatType} items={this.state.repeatOptions} handler={this.handleRepeatTypeSelect} />
            {this.state.repeatType !== "Repeat Type" && this.state.repeatType !== "Off" && this.state.repeatType !== "Specific Weekdays" && (
              <input
                type="text"
                className="no-background"
                placeholder="Duration"
                value={this.state.repeatDuration}
                onChange={this.handleDurationChange}
              />
            )}
            {this.state.error && <p className="error">{this.state.error}</p>}
            {this.state.repeatType === "Specific Weekdays" && (<div className="weekday-picker">
              {this.state.days.map((day, index) => (
                <CustomCheckbox
                  key={day.day}
                  checked={day.checked}
                  onChange={() => { this.handleDayChange(index); }}
                  icon={<FaRegCircle className="checkbox_icon_unchecked" />}
                  checkedIcon={<FaCircle className="checkbox_icon_checked" />}
                  letter={day.day[0]}
                />
              ))}
            </div>)}
          </div>
          <div className="bottom-btns">
            <button
              className={`btn cancel-btn${this.props.darkmode ? ' dark' : ''}`}
              onClick={this.handleClosePopup}
            >
              Cancel
            </button>
            <button onClick={this.createTask} className="btn btn-primary add-btn">{this.state.poptype}</button>
          </div>
        </div>
      </div>
    )
  }
}
