'use client'

import { FaRegCalendar, FaRegCalendarAlt } from "react-icons/fa";
import { MdCalendarViewWeek } from "react-icons/md";
import AddIcon from "@mui/icons-material/Add";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { BsLayoutSidebar } from "react-icons/bs";
import { CiHashtag } from "react-icons/ci";
import { FaSearch } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import '../styles/sidebar.scss'
import { useState } from "react";
import { useTasks } from "../contexts/TaskContext";

function Sidebar({ show, setShowSidebar, setDarkMode, darkmode, viewPage, setViewPage, projects }) {
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
        <li onClick={() => setViewPage('Today')} className={viewPage === 'Today' ? 'active' : ''}>
          <FaRegCalendar />
          <span> Today</span>
        </li>
        <li onClick={() => setViewPage('Upcoming')} className={viewPage === 'Upcoming' ? 'active' : ''}>
          <MdCalendarViewWeek />
          <span> Upcoming</span>
        </li>
        <li onClick={() => setViewPage('Calendar')} className={viewPage === 'Calendar' ? 'active' : ''}>
          <FaRegCalendarAlt />
          <span> Calendar</span>
        </li>
        <li onClick={() => setViewPage('Search')} className={viewPage === 'Search' ? 'active' : ''}>
          <FaSearch />
          <span> Search</span>
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
