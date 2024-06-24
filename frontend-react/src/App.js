import Sidebar from "./components/layout/Sidebar";
import Upcoming from "./Upcoming";
import ComingSoon from "./ComingSoon";
import CreateTaskPopup from "./components/CreateTaskPopup";
import React, { useState, useEffect } from "react";
import { BsLayoutSidebar } from "react-icons/bs";
import Header from "./components/layout/Header";
import dayjs from "dayjs";
import { getTasks, updateField, deleteTask } from "./service";

function App() {
	// UI modes
	const [showSidebar, setShowSidebar] = useState(() => {
		const savedShowSidebar = localStorage.getItem('showSidebar');
		return savedShowSidebar ? JSON.parse(savedShowSidebar) : true;
	});
	const [darkMode, setDarkMode] = useState(() => {
		const savedDarkMode = localStorage.getItem('darkMode');
		return savedDarkMode ? JSON.parse(savedDarkMode) : false;
	});
	const [viewPage, setViewPage] = useState(() => {
		const savedViewPage = localStorage.getItem('viewPage');
		return savedViewPage ? JSON.parse(savedViewPage) : 'Upcoming';
	});

	// Save to local storage whenever showSidebar or darkMode changes
	useEffect(() => {
		localStorage.setItem('showSidebar', JSON.stringify(showSidebar));
	}, [showSidebar]);
	useEffect(() => {
		localStorage.setItem('darkMode', JSON.stringify(darkMode));
	}, [darkMode]);
	useEffect(() => {
		localStorage.setItem('viewPage', JSON.stringify(viewPage));
	}, [viewPage]);

	// Popup
	const [showPopup, setShowPopup] = useState(false);
	const [popupDate, setPopupDate] = useState("");
	// Variables
	const [taskDays, setTaskDays] = useState([]);
	const [startDate, setStartDate] = useState(dayjs());

	const callPopup = (date) => {
		setPopupDate(date);
		setShowPopup(true);
	}

	useEffect(() => {
		fetchTasks();
	}, []);

	const onPopupClose = (updated = false) => {
		if (updated) {
			fetchTasks();
		}
		setPopupDate("");
	};

	const fetchTasks = async () => {
		try {
			const response = await getTasks("bydate");
			setTaskDays(response.itemsByDate);
		} catch (error) {
			console.error("Error fetching Tasks:", error);
		}
	};

	const updateTask = async (id, field, value, date) => {
		try {
			await updateField(id, field, value);
			const updatedTaskDays = { ...taskDays };
			const updateTaskDay = updatedTaskDays[date].map((task) =>
				task.id === id ? { ...task, [field]: value } : task
			);
			updatedTaskDays[date] = updateTaskDay;
			setTaskDays(updatedTaskDays);
		} catch (error) {
			console.error(`Error updating task with id ${id}:`, error);
		}
	};

	const updateBackend = async (id, field, value) => {
		try {
			await updateField(id, field, value);
		} catch (error) {
			console.error(`Error updating task with id ${id}:`, error);
		}
	}

	const removeTask = async (taskId, date) => {
		try {
			const success = await deleteTask(taskId);
			if (success) {
				const updatedTaskDays = { ...taskDays };
				const updateTaskDay = updatedTaskDays[date].filter((task) => task.id !== taskId);
				updatedTaskDays[date] = updateTaskDay;
				setTaskDays(updatedTaskDays);
			} else {
				console.log('Failed to delete task');
			}
		} catch (error) {
			console.error(`Error deleting task with id ${taskId}:`, error);
		}
	};

	const handleDragEnd = (result) => {
		if (!result.destination) {
			return;
		}
		if (result.source.droppableId === result.destination.droppableId && result.source.index !== result.destination.index) {
			const lastChar = result.source.droppableId.charAt(result.source.droppableId.length - 1);
			const date = startDate.add(parseInt(lastChar, 10), 'day').format('YYYY-MM-DD');

			const updatedTaskDays = { ...taskDays };
			const newTasks = updatedTaskDays[date];
			const [removed] = newTasks.splice(result.source.index, 1);
			newTasks.splice(result.destination.index, 0, removed);
			newTasks.forEach((task, index) => {
				task.dayOrder = index + 1;
			});
			setTaskDays(updatedTaskDays);
			// Update backend
			newTasks.forEach((task, index) => {
				updateBackend(task.id, "dayOrder", index + 1);
			});
		}
		else if (result.source.droppableId !== result.destination.droppableId) {
			const sourceChar = result.source.droppableId.charAt(result.source.droppableId.length - 1);
			const sourceDate = startDate.add(parseInt(sourceChar, 10), 'day').format('YYYY-MM-DD');
			const destChar = result.destination.droppableId.charAt(result.destination.droppableId.length - 1);
			const destDate = startDate.add(parseInt(destChar, 10), 'day').format('YYYY-MM-DD');

			const updatedTaskDays = { ...taskDays };
			const sourceTasks = updatedTaskDays[sourceDate];
			const [removed] = sourceTasks.splice(result.source.index, 1);
			removed.date = destDate;
			updatedTaskDays[destDate] ??= [];
			const destTasks = updatedTaskDays[destDate];
			destTasks.splice(result.destination.index, 0, removed);
			sourceTasks.forEach((task, index) => {
				task.dayOrder = index + 1;
			});
			destTasks.forEach((task, index) => {
				task.dayOrder = index + 1;
			});
			setTaskDays(updatedTaskDays);
			// Update backend
			updateBackend(removed.id, "taskDate", destDate);
			sourceTasks.forEach((task, index) => {
				updateBackend(task.id, "dayOrder", index + 1);
			});
			destTasks.forEach((task, index) => {
				updateBackend(task.id, "dayOrder", index + 1);
			});
		}
	};

	return (
		<div className="App">
			<div className={`app-container${darkMode ? ' dark' : ''}`}>
				<button className={`sidebarButton${showSidebar ? '' : ' hidden'}`} onClick={() => setShowSidebar(!showSidebar)}>
					<BsLayoutSidebar className={`sidebarIcon${darkMode ? ' dark' : ''}`} />
				</button>
				<Sidebar setShowPopup={setShowPopup} show={showSidebar} setDarkMode={setDarkMode} darkmode={darkMode} setViewPage={setViewPage} />
				{showPopup && (<CreateTaskPopup setTrigger={setShowPopup} onPopupClose={onPopupClose} date={popupDate} />)}
				<div className={`content${showSidebar ? '' : ' hidden'}${darkMode ? ' dark' : ''}`}>
					<Header darkmode={darkMode} useDate={startDate} setDate={setStartDate} viewPage={viewPage} />
					{viewPage === 'Upcoming' ? (<Upcoming
						showPopup={showPopup}
						darkMode={darkMode}
						callPapaPopup={callPopup}
						updateTask={updateTask}
						removeTask={removeTask}
						handleDragEnd={handleDragEnd}
						taskDays={taskDays}
						startDate={startDate}
					/>) : viewPage === 'Today' ? (
						<ComingSoon />
					) : viewPage === 'Completed' ? (
						<ComingSoon />
					) : viewPage === 'Calendar' ? (
						<ComingSoon />
					) : "Something went wrong"
					}
				</div>
			</div>
		</div>
	);
}

export default App;
