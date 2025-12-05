'use client'

import React from "react";
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

function MainView() {
	const projects = ["Home", "Office", "Personal"];
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
		popupTaskItem
	} = useTasks();

	const dummySetDate = () => { };

	return (
		<div className="App">
			<div className={`app-container${darkMode ? ' dark' : ''}`}>
				<Sidebar setShowPopup={callPopup} show={showSidebar} setShowSidebar={setShowSidebar} setDarkMode={setDarkMode} darkmode={darkMode} viewPage={viewPage} setViewPage={setViewPage} projects={projects} />
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
