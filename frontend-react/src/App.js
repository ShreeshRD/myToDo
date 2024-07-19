import Sidebar from "./components/layout/Sidebar";
import Upcoming from "./Upcoming";
import Today from "./Today";
import Completed from "./Completed"
import ComingSoon from "./ComingSoon";
import CreateTaskPopup from "./components/CreateTaskPopup";
import React, { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import dayjs from "dayjs";
import { getTasks, updateField, deleteTask, addTask } from "./service";

function App() {
	//TODO
	const projects = ["Home", "Office", "Personal"];
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
	const [popupTaskItem, setPopupTaskItem] = useState(null);
	// Variables
	const [taskDays, setTaskDays] = useState([]);
	const [completedTasks, setCompletedTasks] = useState([]);
	const [overdueTasks, setOverdueTasks] = useState({ overdue: [] });
	const [startDate, setStartDate] = useState(dayjs());
	const [completedDate, setCompletedDate] = useState(dayjs().subtract(7, 'day'));
	const dummySetDate = () => { };

	const callPopup = (date, task = null) => {
		setPopupDate(date);
		setPopupTaskItem(task);
		setShowPopup(true);
	}

	useEffect(() => {
		fetchTasks();
	}, []);

	const onPopupClose = async (deleteid = -1, taskDate, taskName = '', dateChoice, projectChoice = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, taskOrder = 0) => {
		if (taskName.trim() !== '') {
			let task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration);
			if (deleteid !== -1) {
				await removeTask(deleteid, taskDate, true);
				task.dayOrder = taskOrder;
				updateBackend(task.id, "dayOrder", taskOrder);
			}
			addToFrontend(task);
		}
		setPopupDate("");
		setPopupTaskItem(null);
	};

	const fetchTasks = async () => {
		try {
			const response = await getTasks("bydate");
			const today = dayjs().format("YYYY-MM-DD")

			const newCompletedTasks = {};
			const newOverdueTasks = { overdue: [] };
			const newTaskDays = {};
			for (const date in response.itemsByDate) {
				const tasks = response.itemsByDate[date];
				if (date < today) {
					// If date has passed
					tasks.forEach(task => {
						if (task.complete) {
							if (!newCompletedTasks[date]) {
								newCompletedTasks[date] = [];
							}
							newCompletedTasks[date].push(task);
						} else {
							newOverdueTasks.overdue.push(task);
						}
					});
				}
				else {
					tasks.forEach(task => {
						if (task.complete) {
							if (!newCompletedTasks[date]) {
								newCompletedTasks[date] = [];
							}
							newCompletedTasks[date].push(task);
						}
						else {
							if (!newTaskDays[date]) {
								newTaskDays[date] = [];
							}
							newTaskDays[date].push(task);
						}
					});
				}
			}
			setCompletedTasks(newCompletedTasks);
			setOverdueTasks(newOverdueTasks);
			setTaskDays(newTaskDays);
		} catch (error) {
			console.error("Error fetching tasks:", error);
		}
	};

	const addToFrontend = (task) => {
		if (task.taskDate < dayjs().format("YYYY-MM-DD")) {
			setOverdueTasks(prevTaskDays => ({
				...prevTaskDays,
				overdue: [...(prevTaskDays.overdue || []), task]
			}));
		}
		else {
			setTaskDays(prevTaskDays => ({
				...prevTaskDays,
				[task.taskDate]: [
					...(prevTaskDays[task.taskDate] || []),
					task
				]
			}));
		}
	}

	const updateTask = async (id, field, value, date) => {
		try {
			const taskItem = await updateField(id, field, value);
			const updatedTaskDays = { ...taskDays };
			if (field === "complete" && date < dayjs().format("YYYY-MM-DD")) {
				const updatedOverdue = { ...overdueTasks };
				// Change the date
				date = dayjs().format("YYYY-MM-DD");
				await updateField(id, "taskDate", date);
				taskItem.taskDate = date;
				const existingTasks = updatedTaskDays[date] || [];
				taskItem.dayOrder = existingTasks.length + 1;
				updatedTaskDays[date] = [...existingTasks, taskItem];
				// Remove from overdue list
				const finalOverdue = { ...updatedOverdue };
				finalOverdue.overdue = finalOverdue.overdue.filter(task => task.id !== id);
				setOverdueTasks(finalOverdue);
			}
			if (field === "complete" && value && taskItem.repeatType !== "NONE") {
				addNextRepeat(taskItem);
			}
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

	const addNextRepeat = async (task) => {
		const { taskDate, repeatType, repeatDuration } = task;
		let date = dayjs(taskDate);

		switch (repeatType) {
			case "EVERY_X_DAYS":
				date = date.add(repeatDuration, 'day');
				break;
			case "EVERY_X_WEEKS":
				date = date.add(repeatDuration, 'week');
				break;
			case "EVERY_X_MONTHS":
				date = date.add(repeatDuration, 'month');
				break;
			case "SPECIFIC_WEEKDAYS":
				const binaryString = repeatDuration.toString(2).padStart(7, '0');
				let nextDayFound = false;
				while (!nextDayFound) {
					date = date.add(1, 'day');
					const dayIndex = (date.day() + 6) % 7;
					if (binaryString[dayIndex] === '1') {
						nextDayFound = true;
					}
				}
				break;
			default:
				break;
		}

		const newDate = date.format('YYYY-MM-DD');
		task.taskDate = newDate;

		try {
			const newTask = await addTask(task.name, newDate, task.category, task.priority, repeatType, repeatDuration);
			addToFrontend(newTask);
		} catch (error) {
			console.error('Error adding task:', error);
		}
	};

	const removeTask = async (taskId, date, update = false) => {
		try {
			const task_completed = await deleteTask(taskId);
			if (task_completed) {
				const newCompletedTasks = { ...completedTasks };
				newCompletedTasks[date] = newCompletedTasks[date].filter((task) => task.id !== taskId);

				if (!update) {
					newCompletedTasks[date].forEach((task, index) => {
						task.dayOrder = index + 1;
						updateBackend(task.id, "dayOrder", index + 1);
					});
				}
				setCompletedTasks(newCompletedTasks);
			}
			else {
				if (date < dayjs().format("YYYY-MM-DD")) {
					const updatedOverdue = { ...overdueTasks };
					updatedOverdue.overdue = updatedOverdue.overdue.filter((task) => task.id !== taskId);
					setOverdueTasks(updatedOverdue);
				}
				else {
					const updatedTaskDays = { ...taskDays };
					updatedTaskDays[date] = updatedTaskDays[date].filter((task) => task.id !== taskId);
					if (!update) {
						updatedTaskDays[date].forEach((task, index) => {
							task.dayOrder = index + 1;
							updateBackend(task.id, "dayOrder", index + 1);
						});
					}
					setTaskDays(updatedTaskDays);
				}
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
				<Sidebar setShowPopup={setShowPopup} show={showSidebar} setShowSidebar={setShowSidebar} setDarkMode={setDarkMode} darkmode={darkMode} setViewPage={setViewPage} projects={projects} />
				{showPopup && (<CreateTaskPopup setTrigger={setShowPopup} onPopupClose={onPopupClose} date={popupDate} projects={projects} darkmode={darkMode} task={popupTaskItem} />)}
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
