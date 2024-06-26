import Sidebar from "./components/layout/Sidebar";
import Upcoming from "./Upcoming";
import Today from "./Today";
import Completed from "./Completed"
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
	const [completedTasks, setCompletedTasks] = useState([]);
	const [overdueTasks, setOverdueTasks] = useState({ overdue: [] });
	const [startDate, setStartDate] = useState(dayjs());
	const [completedDate, setCompletedDate] = useState(dayjs().subtract(7, 'day'));
	const dummySetDate = () => { };

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
			const today = dayjs().format("YYYY-MM-DD")

			const newCompletedTasks = {};
			const newOverdueTasks = { overdue: [] };
			for (const date in response.itemsByDate) {
				if (date < today) {
					// If date has passed
					const tasks = response.itemsByDate[date];
					tasks.forEach(task => {
						if (task.complete) {
							if (!newCompletedTasks[date]) {
								newCompletedTasks[date] = [];
							}
							newCompletedTasks[date].push(task);
						} else {
							newOverdueTasks["overdue"].push(task);
						}
					});
				}
			}
			setCompletedTasks(newCompletedTasks);
			setOverdueTasks(newOverdueTasks);
			// console.log(overdueTasks);
		} catch (error) {
			console.error("Error fetching tasks:", error);
		}
	};

	const updateTask = async (id, field, value, date) => {
		try {
			await updateField(id, field, value);
			if (field === "complete" && value && date < dayjs().format("YYYY-MM-DD")) {
				const updatedOverdue = { ...overdueTasks };
				updatedOverdue.overdue = updatedOverdue.overdue.map((task) =>
					task.id === id ? { ...task, [field]: value } : task
				);
				setOverdueTasks(updatedOverdue);
				setTimeout(() => {
					const finalOverdue = { ...updatedOverdue };
					finalOverdue.overdue = finalOverdue.overdue.filter(task => task.id !== id);
					setOverdueTasks(finalOverdue);
				}, 1000);
			}
			const updatedTaskDays = { ...taskDays };
			updatedTaskDays[date] = updatedTaskDays[date].map((task) =>
				task.id === id ? { ...task, [field]: value } : task
			);
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
				if (date < dayjs().format("YYYY-MM-DD")) {
					const updatedOverdue = overdueTasks;
					updatedOverdue.overdue = updatedOverdue.overdue.filter((task) => task.id !== taskId);
					setOverdueTasks(updatedOverdue);
				}
				const updatedTaskDays = { ...taskDays };
				updatedTaskDays[date] = updatedTaskDays[date].filter((task) => task.id !== taskId);
				updatedTaskDays[date].forEach((task, index) => {
					task.dayOrder = index + 1;
					updateBackend(task.id, "dayOrder", index + 1);
				});
				setTaskDays(updatedTaskDays);
			} else {
				console.log('Failed to delete task');
			}
		} catch (error) {
			console.error(`Error deleting task with id ${taskId}:`, error);
		}
	};

	const handleDragEnd = (result) => {
		if (!result.destination || result.destination.droppableId === "tasks__list100") {
			return;
		}
		else if (result.source.droppableId === "tasks__list100") {
			// If source item is from overdue list
			const destChar = result.destination.droppableId.charAt(result.destination.droppableId.length - 1);
			const destDate = startDate.add(parseInt(destChar, 10), 'day').format('YYYY-MM-DD');

			const updatedTaskDays = { ...taskDays };
			updatedTaskDays[destDate] ??= [];
			const newTasks = updatedTaskDays[destDate];
			const [removed] = overdueTasks.overdue.splice(result.source.index, 1);
			removed.taskDate = destDate;
			newTasks.splice(result.destination.index, 0, removed);
			newTasks.forEach((task, index) => {
				task.dayOrder = index + 1;
			});
			setTaskDays(updatedTaskDays);
			// Update backend
			updateBackend(removed.id, "taskDate", destDate);
			newTasks.forEach((task, index) => {
				updateBackend(task.id, "dayOrder", index + 1);
			});
		}
		else if (result.source.droppableId === result.destination.droppableId && result.source.index !== result.destination.index) {
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
			removed.taskDate = destDate;
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
						<ComingSoon />
					) : "Something went wrong"
					}
				</div>
			</div>
		</div>
	);
}

export default App;
