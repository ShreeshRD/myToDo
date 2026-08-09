'use client'

import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CalendarView from "./CalendarView";
import CreateTaskPopup from "./CreateTaskPopup";
import Upcoming from "./Upcoming";
import Search from "./Search";
import TodayView from "./TodayView";
import Scratchpad from "./Scratchpad/index";
import { useUI } from "../contexts/UIContext";
import { useTasks } from "../contexts/TaskContext";
import { setPageContext } from "../lib/agentClient";
import dayjs from "dayjs";

const DEFAULT_PROJECTS = ["Home", "Office", "Personal"];
const STORAGE_KEY = "todo-projects";
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "";

function MainView() {
	const [projects, setProjects] = useState(DEFAULT_PROJECTS);
	const [showAgentSidebar, setShowAgentSidebar] = useState(false);
	const iframeRef = useRef(null);
	const { showSidebar, setShowSidebar, theme, setTheme, viewPage, setViewPage } = useUI();
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

	// Reset startDate to today when switching to Upcoming view
	useEffect(() => {
		if (viewPage === 'Upcoming') {
			setStartDate(dayjs().startOf('day'));
		}
	}, [viewPage, setStartDate]);

	// -------------------------------------------------------------------------
	// Page context — keep agent-app in sync whenever route/popup changes
	// -------------------------------------------------------------------------
	const sendPageContext = useCallback((ctx) => {
		// 1. PUT to agent-app application-state so view-screen can read it
		setPageContext(ctx);

		// 2. postMessage to the embedded iframe to pre-fill the composer
		if (iframeRef.current && AGENT_URL) {
			try {
				iframeRef.current.contentWindow?.postMessage(
					{ type: "agentNative.setChatContext", context: ctx },
					AGENT_URL,
				);
			} catch {
				// cross-origin guard — silently ignore
			}
		}
	}, []);

	useEffect(() => {
		sendPageContext({
			view: viewPage,
			selectedTaskId: popupTaskItem?.id ?? null,
			selectedDate: popupDate || null,
			filters: [],
		});
	}, [viewPage, popupTaskItem, popupDate, sendPageContext]);

	// -------------------------------------------------------------------------
	// iframe trust handshake on load
	// -------------------------------------------------------------------------
	const handleIframeLoad = () => {
		if (!iframeRef.current || !AGENT_URL) return;
		try {
			iframeRef.current.contentWindow?.postMessage(
				{ type: "agentNative.frameOrigin", origin: window.location.origin },
				AGENT_URL,
			);
		} catch {
			// silently ignore cross-origin errors
		}
	};

	// -------------------------------------------------------------------------
	// Project helpers
	// -------------------------------------------------------------------------
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
		if (deleteIncomplete) {
			await deleteTasksByCategory(projectName);
		} else {
			await clearCategoryForTasks(projectName);
		}
		removeProject(projectName);
	};

	const dummySetDate = () => { };

	return (
		<div className="App">
			<div className={`app-container ${theme}`}>
				<Sidebar setShowPopup={callPopup} show={showSidebar} setShowSidebar={setShowSidebar} setTheme={setTheme} theme={theme} viewPage={viewPage} setViewPage={setViewPage} projects={projects} addProject={addProject} removeProject={removeProject} reorderProjects={reorderProjects} deleteProjectWithTasks={deleteProjectWithTasks} popupBlur={showPopup && theme === 'glass'} />
				{showPopup && (<CreateTaskPopup setTrigger={onPopupClose} onPopupClose={onPopupClose} date={popupDate} projects={projects} theme={theme} task={popupTaskItem} />)}

				{/* Main content — shifts left when agent sidebar opens */}
				<div className={`content${showSidebar ? '' : ' hidden'} ${theme}${showPopup && theme === 'glass' ? ' popup-blur' : ''}${showAgentSidebar ? ' agent-sidebar-open' : ''}`}>
					{viewPage === 'Upcoming' ? (
						<>
							<Header theme={theme} useDate={startDate} setDate={setStartDate} viewPage={viewPage} />
							<Upcoming />
						</>
					) : viewPage === 'Today' ? (
						<>
							<Header theme={theme} useDate={dayjs()} setDate={dummySetDate} viewPage={viewPage} />
							<TodayView />
						</>
					) : viewPage === 'Calendar' ? (
						<>
							<Header theme={theme} useDate={completedDate} setDate={setCompletedDate} viewPage={viewPage} />
							<CalendarView />
						</>
					) : viewPage === 'Search' ? (
						<Search />
					) : viewPage === 'Scratchpad' ? (
						<Scratchpad theme={theme} />
					) : "Something went wrong"
					}
				</div>

				{/* Agent sidebar panel */}
				{AGENT_URL && (
					<aside className={`agent-sidebar${showAgentSidebar ? ' agent-sidebar--open' : ''}`}>
						{showAgentSidebar && (
							<iframe
								ref={iframeRef}
								id="agent-iframe"
								className="agent-sidebar__iframe"
								src={AGENT_URL}
								title="Todo AI Assistant"
								onLoad={handleIframeLoad}
								allow="clipboard-read; clipboard-write"
							/>
						)}
					</aside>
				)}

				{/* Floating toggle button */}
				{AGENT_URL && (
					<button
						id="agent-fab"
						className={`agent-fab${showAgentSidebar ? ' agent-fab--active' : ''}`}
						onClick={() => setShowAgentSidebar(prev => !prev)}
						aria-label={showAgentSidebar ? "Close AI assistant" : "Open AI assistant"}
						title={showAgentSidebar ? "Close AI assistant" : "Open AI assistant"}
					>
						<span className="agent-fab__icon" aria-hidden="true">
							{showAgentSidebar ? (
								// Close X
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							) : (
								// Chat bubble with sparkle
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
									<path d="M9 9h.01M12 9h.01M15 9h.01" strokeWidth="2.5" />
								</svg>
							)}
						</span>
						<span className="agent-fab__label">
							{showAgentSidebar ? "Close" : "Ask AI"}
						</span>
					</button>
				)}
			</div>
		</div>
	);
}

export default MainView;
