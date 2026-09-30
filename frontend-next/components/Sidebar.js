'use client'

import { FaRegCalendar, FaRegCalendarAlt } from "react-icons/fa";
import { MdCalendarViewWeek } from "react-icons/md";
import AddIcon from "@mui/icons-material/Add";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { BsLayoutSidebar } from "react-icons/bs";
import { CiHashtag } from "react-icons/ci";
import { FaRegStickyNote } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import '../styles/sidebar.scss'
import { useState, useRef, useEffect } from "react";
import { useTasks } from "../contexts/TaskContext";
import ProjectManagerModal from "./ProjectManagerModal";
import { projectColor } from "../lib/projectColors";

function Sidebar({
  show,
  setShowSidebar,
  setTheme,
  theme,
  viewPage,
  setViewPage,
  projects,
  addProject,
  reorderProjects,
  deleteProjectWithTasks,
  popupBlur
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

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('glass');
    else setTheme('light');
  };

  const navItems = [
    { page: 'Today', label: 'Today', icon: <FaRegCalendar /> },
    { page: 'Upcoming', label: 'Upcoming', icon: <MdCalendarViewWeek /> },
    { page: 'Calendar', label: 'Calendar', icon: <FaRegCalendarAlt /> },
    { page: 'Search', label: 'Search', icon: <FaSearch /> },
    { page: 'Scratchpad', label: 'Scratchpad', icon: <FaRegStickyNote /> },
  ];

  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Glass';

  return (
    <>
      {!show && (
        <button className="sidebar__reopen" onClick={() => setShowSidebar(true)} title="Show sidebar" aria-label="Show sidebar">
          <BsLayoutSidebar />
        </button>
      )}
      <div className={`sidebar${show ? '' : ' hidden'} ${theme}${popupBlur ? ' popup-blur' : ''}`}>
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <span className="sidebar__logo" aria-hidden="true">✓</span>
            <span>myToDo</span>
          </div>
          <div className="sidebar__top-actions">
            <button className="sidebar__icon-btn darkmodeButton" onClick={toggleTheme} title={`Theme: ${themeLabel}`} aria-label={`Theme: ${themeLabel}`}>
              {theme === 'light' && <LightModeIcon className={`darkmodeIcon ${theme}`} />}
              {theme === 'dark' && <DarkModeIcon className={`darkmodeIcon ${theme}`} />}
              {theme === 'glass' && <AutoAwesomeIcon className={`darkmodeIcon ${theme}`} />}
            </button>
            <button className="sidebar__icon-btn sidebarButton" onClick={() => setShowSidebar(!show)} title="Hide sidebar" aria-label="Hide sidebar">
              <BsLayoutSidebar className={`sidebarIcon ${theme}`} />
            </button>
          </div>
        </div>
        <ul className="sidebar__generic">
          <li className="sidebar__add" onClick={() => callPopup()}>
            <span className="sidebar__add-icon"><AddIcon className="add-icon" /></span>
            <span>Add task</span>
          </li>
          {navItems.map(item => (
            <li key={item.page} onClick={() => setViewPage(item.page)} className={viewPage === item.page ? 'active' : ''}>
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
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
                  <CiHashtag className="projects__hash" style={{ color: projectColor(project) }} />
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
        theme={theme}
      />
    </>
  );
}

export default Sidebar;
