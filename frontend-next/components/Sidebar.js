'use client'

import { FaRegCalendar, FaRegCalendarAlt } from "react-icons/fa";
import { MdCalendarViewWeek } from "react-icons/md";
import AddIcon from "@mui/icons-material/Add";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { BsLayoutSidebar } from "react-icons/bs";
import { CiHashtag } from "react-icons/ci";
import { FaSearch } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import '../styles/sidebar.scss'
import { useState, useRef, useEffect } from "react";
import { useTasks } from "../contexts/TaskContext";
import ProjectManagerModal from "./ProjectManagerModal";

function Sidebar({
  show,
  setShowSidebar,
  setDarkMode,
  darkmode,
  viewPage,
  setViewPage,
  projects,
  addProject,
  reorderProjects,
  deleteProjectWithTasks
}) {
  const [dropdown, setDropdown] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectManager, setShowProjectManager] = useState(false);
  const inputRef = useRef(null);
  const { callPopup, toggleProject, selectedProjects } = useTasks();

  // Focus input when it appears
  useEffect(() => {
    if (showAddInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddInput]);

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim());
      setNewProjectName("");
      setShowAddInput(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAddProject();
    } else if (e.key === "Escape") {
      setNewProjectName("");
      setShowAddInput(false);
    }
  };

  const handleProjectDelete = (projectName, deleteIncomplete) => {
    deleteProjectWithTasks(projectName, deleteIncomplete);
  };

  return (
    <>
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
        <div className="sidebar__projects">
          <div className="projects__header">
            <div
              className="projects__title-wrapper"
              onClick={() => setDropdown(!dropdown)}
              title={dropdown ? "Collapse" : "Expand"}
            >
              <span className="projects__title">My Projects</span>
              <IoIosArrowDown className={`projects__icon projects__arrow${dropdown ? ' open' : ''}`} />
            </div>
            <div className="projects__actions">
              <button
                className="projects__action-btn"
                onClick={() => setShowAddInput(!showAddInput)}
                title="Add project"
              >
                <AddIcon className="projects__icon" />
              </button>
              <button
                className="projects__action-btn"
                onClick={() => setShowProjectManager(true)}
                title="Manage projects"
              >
                <MoreVertIcon className="projects__icon" />
              </button>
            </div>
          </div>

          {showAddInput && (
            <div className="projects__add-form">
              <input
                ref={inputRef}
                type="text"
                className="projects__input"
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newProjectName.trim()) {
                    setShowAddInput(false);
                  }
                }}
              />
            </div>
          )}

          <ul className={`projects__list${dropdown ? ' open' : ''}`}>
            {projects.map((project, index) => (
              <li
                key={index}
                onClick={() => toggleProject(project)}
                className={`projects__item${selectedProjects.includes(project) ? ' active' : ''}`}
              >
                <div className="projects__item-content">
                  <CiHashtag className="projects__hash" />
                  <span>{project}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProjectManagerModal
        isOpen={showProjectManager}
        onClose={() => setShowProjectManager(false)}
        projects={projects}
        onReorder={reorderProjects}
        onDelete={handleProjectDelete}
        darkMode={darkmode}
      />
    </>
  );
}

export default Sidebar;
