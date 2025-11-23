import Sidebar from "./components/layout/Sidebar";
import Upcoming from "./Upcoming";
import Today from "./Today";
import Completed from "./Completed"
import ComingSoon from "./ComingSoon";
import CalendarView from "./CalendarView";
import CreateTaskPopup from "./components/CreateTaskPopup";
import React from "react";
import Header from "./components/layout/Header";
import { useUI } from "./contexts/UIContext";
import { useTasks } from "./contexts/TaskContext";
import dayjs from "dayjs";

function App() {
	const projects = ["Home", "Office", "Personal"];
	const { showSidebar, setShowSidebar, darkMode, setDarkMode, viewPage, setViewPage } = useUI();
	const {
		taskDays,
		completedTasks,
		overdueTasks,
		startDate,
		setStartDate,
		completedDate,
		setCompletedDate,
		updateTask,
		removeTask,
		handleDragEnd,
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
				<Sidebar setShowPopup={callPopup} show={showSidebar} setShowSidebar={setShowSidebar} setDarkMode={setDarkMode} darkmode={darkMode} setViewPage={setViewPage} projects={projects} />
				{showPopup && (<CreateTaskPopup setTrigger={onPopupClose} onPopupClose={onPopupClose} date={popupDate} projects={projects} darkmode={darkMode} task={popupTaskItem} />)}
				<div className={`content${showSidebar ? '' : ' hidden'}${darkMode ? ' dark' : ''}`}>
					{viewPage === 'Upcoming' ? (
						<>
							<Header darkmode={darkMode} useDate={startDate} setDate={setStartDate} viewPage={viewPage} />
							<Upcoming
								showPopup={showPopup}
								darkMode={darkMode}
								callPapaPopup={callPopup}
								updateTask={updateTask}
								removeTask={removeTask}
								handleDragEnd={handleDragEnd}
								taskDays={taskDays}
								overdueTasks={overdueTasks}
								startDate={startDate}
							/>
						</>
					) : viewPage === 'Today' ? (
						<>
							<Header darkmode={darkMode} useDate={dayjs()} setDate={dummySetDate} viewPage={viewPage} />
							<Today
								showPopup={showPopup}
								darkMode={darkMode}
								callPapaPopup={callPopup}
								updateTask={updateTask}
								removeTask={removeTask}
								handleDragEnd={handleDragEnd}
								taskDays={taskDays}
								overdueTasks={overdueTasks}
								startDate={dayjs()}
							/>
						</>
					) : viewPage === 'Completed' ? (
						<>
							<Header darkmode={darkMode} useDate={completedDate} setDate={setCompletedDate} viewPage={viewPage} />
							<Completed
								showPopup={showPopup}
								darkMode={darkMode}
								callPapaPopup={callPopup}
								updateTask={updateTask}
								removeTask={removeTask}
								handleDragEnd={handleDragEnd}
								taskDays={completedTasks}
								overdueTasks={overdueTasks}
								startDate={completedDate}
							/>
						</>
					) : viewPage === 'Calendar' ? (
						<CalendarView />
					) : "Something went wrong"
					}
				</div>
			</div>
		</div>
	);
}

export default App;
