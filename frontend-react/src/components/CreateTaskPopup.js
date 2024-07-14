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
    this.state = {
      taskName: '',
      selectedDate: initialDate,
      selectedProject: 'Project',
      selectedPriority: 'Priority',
      priorities: ["P0", "P1", "P2", "P3", "P4"],
      repeatType: "Repeat Type",
      repeatOptions: ["Off", "Every X days", "Every X weeks", "Every X months", "Specific weekdays"],
      repeatDuration: '',
      repeatCustom: 0,
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
    };
  }

  createTask = async () => {
    const { taskName, selectedDate, selectedProject, selectedPriority, repeatType, repeatDuration, repeatCustom } = this.state;
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
      'Every X days': 'EVERY_X_DAYS',
      'Every X weeks': 'EVERY_X_WEEKS',
      'Every X months': 'EVERY_X_MONTHS',
      'Specific weekdays': 'SPECIFIC_WEEKDAYS'
    };
    let repeatTypeValue = repeatMap[repeatType];
    let repeatDurationInt = repeatTypeValue === 'NONE' ? 0 : repeatDuration === '' ? 1 : parseInt(repeatDuration, 10);
    repeatDurationInt = repeatTypeValue === 'SPECIFIC_WEEKDAYS' ? repeatCustom : repeatDurationInt;
    this.props.onPopupClose(taskName, formattedDate, projectToPass, priorityValue, repeatTypeValue, repeatDurationInt);
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
    const { selectedDate } = this.state;
    this.props.onPopupClose('', selectedDate);
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
        <div className="createTask addShadow">
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
            {this.state.repeatType !== "Repeat Type" && this.state.repeatType !== "Off" && this.state.repeatType !== "Specific weekdays" && (
              <input
                type="text"
                className="no-background"
                placeholder="Duration"
                value={this.state.repeatDuration}
                onChange={this.handleDurationChange}
              />
            )}
            {this.state.error && <p className="error">{this.state.error}</p>}
            {this.state.repeatType === "Specific weekdays" && (<div className="weekday-picker">
              {this.state.days.map((day, index) => (
                <CustomCheckbox
                  key={day.day}
                  checked={day.checked}
                  onChange={() => this.handleDayChange(index)}
                  icon={<FaRegCircle className="checkbox_icon_unchecked" />}
                  checkedIcon={<FaCircle className="checkbox_icon_checked" />}
                  letter={day.day[0]}
                />
              ))}
            </div>)}
          </div>
          <div className="bottom-btns">
            <button
              className="btn cancel-btn mx-2"
              onClick={this.handleClosePopup}
            >
              Cancel
            </button>
            <button onClick={this.createTask} className="btn btn-primary">Add Task</button>
          </div>
        </div>
      </div>
    )
  }
}
