'use client'

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CalendarView from "./CalendarView";
import CreateTaskPopup from "./CreateTaskPopup";
import Upcoming from "./Upcoming";
import Search from "./Search";
import TodayView from "./TodayView";
import { useUI } from "../contexts/UIContext";
import { useTasks } from "../contexts/TaskContext";
import dayjs from "dayjs";

const DEFAULT_PROJECTS = ["Home", "Office", "Personal"];
const STORAGE_KEY = "todo-projects";
const DELETED_PROJECTS_KEY = "todo-deleted-projects";

function MainView() {
	const [projects, setProjects] = useState(DEFAULT_PROJECTS);
	const { showSidebar, setShowSidebar, darkMode, setDarkMode, viewPage, setViewPage } = useUI();
	const {
		startDate,
		setStartDate,
		completedDate,
		setCompletedDate,
		showPopup,
		callPopup,
		onPopupClose,
		popupDate,
		popupTaskItem,
		deleteTasksByCategory,
		clearCategoryForTasks
	} = useTasks();

	// Load projects from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length > 0) {
					// eslint-disable-next-line react-hooks/set-state-in-effect
					setProjects(parsed);
				}
			} catch (e) {
				console.error("Failed to parse stored projects:", e);
			}
		}
	}, []);

	// Save projects to localStorage when they change
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
	}, [projects]);

	const addProject = (projectName) => {
		const trimmed = projectName.trim();
		if (trimmed && !projects.includes(trimmed)) {
			setProjects(prev => [...prev, trimmed]);
		}
	};

	const removeProject = (projectName) => {
		setProjects(prev => prev.filter(p => p !== projectName));
	};

	const reorderProjects = (newOrder) => {
		setProjects(newOrder);
	};

	const deleteProjectWithTasks = async (projectName, deleteIncomplete) => {
		// Track deleted project in localStorage for edge case handling
		const deletedProjects = JSON.parse(localStorage.getItem(DELETED_PROJECTS_KEY) || '[]');
		if (!deletedProjects.includes(projectName)) {
			deletedProjects.push(projectName);
			localStorage.setItem(DELETED_PROJECTS_KEY, JSON.stringify(deletedProjects));
		}

		if (deleteIncomplete) {
			// Delete incomplete tasks with this category
			await deleteTasksByCategory(projectName);
		} else {
			// Clear category for incomplete tasks (set to "None")
			await clearCategoryForTasks(projectName);
		}

		// Remove project from list
		removeProject(projectName);
	};

	const dummySetDate = () => { };

	return (
		<div className="App">
			<div className={`app-container${darkMode ? ' dark' : ''}`}>
				<Sidebar setShowPopup={callPopup} show={showSidebar} setShowSidebar={setShowSidebar} setDarkMode={setDarkMode} darkmode={darkMode} viewPage={viewPage} setViewPage={setViewPage} projects={projects} addProject={addProject} removeProject={removeProject} reorderProjects={reorderProjects} deleteProjectWithTasks={deleteProjectWithTasks} />
				{showPopup && (<CreateTaskPopup setTrigger={onPopupClose} onPopupClose={onPopupClose} date={popupDate} projects={projects} darkmode={darkMode} task={popupTaskItem} />)}
				<div className={`content${showSidebar ? '' : ' hidden'}${darkMode ? ' dark' : ''}`}>
					{viewPage === 'Upcoming' ? (
						<>
							<Header darkmode={darkMode} useDate={startDate} setDate={setStartDate} viewPage={viewPage} />
							<Upcoming />
						</>
					) : viewPage === 'Today' ? (
						<>
							<Header darkmode={darkMode} useDate={dayjs()} setDate={dummySetDate} viewPage={viewPage} />
							<TodayView />
						</>
					) : viewPage === 'Calendar' ? (
						<>
							<Header darkmode={darkMode} useDate={completedDate} setDate={setCompletedDate} viewPage={viewPage} />
							<CalendarView />
						</>
					) : viewPage === 'Search' ? (
						<Search />
					) : "Something went wrong"
					}
				</div>
			</div>
		</div>
	);
}

export default MainView;
