import { FaRegCalendar, FaRegCalendarAlt } from "react-icons/fa";
import { MdCalendarViewWeek } from "react-icons/md";
import AddIcon from "@mui/icons-material/Add";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { BsLayoutSidebar } from "react-icons/bs";
import { CiHashtag } from "react-icons/ci";
import { IoIosArrowDown } from "react-icons/io";
import './sidebar.scss'
import { useState } from "react";
import { useTasks } from "../../contexts/TaskContext";

function Sidebar({ show, setShowSidebar, setDarkMode, darkmode, setViewPage, projects }) {
  const [dropdown, setDropdown] = useState(true);
  const { callPopup, toggleProject, selectedProjects } = useTasks();
  return (
    <div className={`sidebar${show ? '' : ' hidden'}${darkmode ? ' dark' : ''}`}>
      <button className="darkmodeButton" onClick={() => setDarkMode(!darkmode)}>
        <DarkModeIcon className={`darkmodeIcon${darkmode ? ' dark' : ''}`} />
      </button>
      <button className={`sidebarButton${show ? '' : ' hidden'}`} onClick={() => setShowSidebar(!show)}>
        <BsLayoutSidebar className={`sidebarIcon${darkmode ? ' dark' : ''}`} />
      </button>
      <ul className="sidebar__generic">
        <li onClick={() => callPopup()}>
          <AddIcon className="add-icon" />
          <span> Add Task</span>
        </li>
        <li onClick={() => setViewPage('Today')}>
          <FaRegCalendar />
          <span> Today</span>
        </li>
        <li onClick={() => setViewPage('Upcoming')}>
          <MdCalendarViewWeek />
          <span> Upcoming</span>
        </li>
        <li onClick={() => setViewPage('Calendar')}>
          <FaRegCalendarAlt />
          <span> Calendar</span>
        </li>
        <li onClick={() => setViewPage('Completed')}>
          <DoneAllIcon />
          <span> Completed</span>
        </li>
      </ul>
      <ul className="sidebar__projects">
        <div>My Projects<span style={{ cursor: 'pointer' }}><AddIcon /> <IoIosArrowDown onClick={() => setDropdown(!dropdown)} /></span></div>
        {dropdown && (projects.map((project, index) => (
          <li 
            key={index} 
            onClick={() => toggleProject(project)}
            className={selectedProjects.includes(project) ? 'active' : ''}
          >
            <CiHashtag /> {project}
          </li>
        )))}
      </ul>
    </div>
  );
}

export default Sidebar;
