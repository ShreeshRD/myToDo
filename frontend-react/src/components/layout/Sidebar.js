import { FaRegCalendar, FaRegCalendarAlt } from "react-icons/fa";
import { MdCalendarViewWeek } from "react-icons/md";
import AddIcon from "@mui/icons-material/Add";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { CiHashtag } from "react-icons/ci";
import { IoIosArrowDown } from "react-icons/io";
import './sidebar.scss'
import { useState } from "react";

function Sidebar({ setShowPopup, show, setDarkMode, darkmode, setViewPage, projects }) {
  const [dropdown, setDropdown] = useState(true);
  return (
    <div className={`sidebar${show ? '' : ' hidden'}${darkmode ? ' dark' : ''}`}>
      <button className="darkmodeButton" onClick={() => setDarkMode(!darkmode)}>
        <DarkModeIcon className={`darkmodeIcon${darkmode ? ' dark' : ''}`} />
      </button>
      <ul className="sidebar__generic">
        <li onClick={() => setShowPopup(true)}>
          <AddIcon className="add-icon" />
          <span> Add Task</span>
        </li>
        <li onClick={() => setViewPage('Today')}>
          <FaRegCalendar />
          <span> Today</span>
        </li>
        <li onClick={() => setViewPage('Upcoming')}>
          <MdCalendarViewWeek />
          <span> Next 7 Days</span>
        </li>
        <li onClick={() => setViewPage('Calendar')}>
          <FaRegCalendarAlt />
          <span> Calendar</span>
        </li>
        <li onClick={() => setViewPage('Completed')}>
          <DoneAllIcon />
          <span> Completed last week</span>
        </li>
      </ul>
      <ul className="sidebar__projects">
        <div>My Projects<span style={{ cursor: 'pointer' }}><AddIcon /> <IoIosArrowDown onClick={() => setDropdown(!dropdown)} /></span></div>
        {dropdown && (projects.map((project, index) => (
          <li key={index}><CiHashtag /> {project}</li>
        )))}
      </ul>
    </div>
  );
}

export default Sidebar;
