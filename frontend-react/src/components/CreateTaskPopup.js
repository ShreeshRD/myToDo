import React, { Component } from "react";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { addTask } from "../service";

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
    };
  }

  createTask = async () => {
    const { taskName, selectedDate } = this.state;
    const formattedDate = selectedDate.format('YYYY-MM-DD');
    await addTask(taskName, formattedDate);
    this.props.onPopupClose(true);
    this.props.setTrigger(false);
    this.setState({ taskName: '', selectedDate: dayjs() });
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
      event.preventDefault(); // Prevent form submission if it's a form input
      this.createTask();
    } else if (event.key === 'Escape') {
      this.handleClosePopup();
    }
  };

  componentDidMount() {
    this.inputRef.current.focus();
  }

  render() {
    return (
      <div className="taskPopup">
        <div className="createTask addShadow">
          <input
            type="text"
            className="no-background"
            placeholder="Enter text here"
            value={this.state.taskName}
            onChange={this.handleTaskNameChange}
            onKeyDown={this.handleInputKeyDown}
            ref={this.inputRef}
          />
          <button className="hide-btn" onClick={this.handleClosePopup}>
            <CloseIcon className="close-btn" />
          </button>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label=""
              defaultValue={dayjs()}
              value={this.state.selectedDate}
              onChange={this.handleDateChange}
            />
          </LocalizationProvider>
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
