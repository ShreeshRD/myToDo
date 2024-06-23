import axios from "axios";

const API_URL = "http://localhost:8080/todo";
// const API_URL = "http://192.168.1.2:8080/todo";
// const API_URL = "http://192.168.1.3:8080/todo";
// const API_URL = "http://192.168.1.4:8080/todo";
// const API_URL = "http://192.168.1.5:8080/todo";
// const API_URL = "http://192.168.1.6:8080/todo";
// const API_URL = "http://192.168.1.7:8080/todo";
// const API_URL = "http://192.168.1.8:8080/todo";
// const API_URL = "http://192.168.1.9:8080/todo";

export const getTasks = (more = "") => {
	return axios.get(API_URL + "/all" + more)
		.then(response => {
			// console.log(response.data);
			return response.data;
		})
		.catch(error => {
			console.error("Error fetching tasks:", error);
			throw error; // Re-throw the error to propagate it up the call stack
		});
};

export const updateField = async (id, field, value) => {
	try {
		// const response = 
		await axios.post(`${API_URL}/update`, null, {
			params: {
				id: id,
				field: field,
				value: value.toString(),
			},
		});

		// console.log('Task updated successfully:', response.data);
	} catch (error) {
		console.error(`Error updating task with id ${id}:`, error);
	}
};

export const addTask = async (task, tdate, category = "Upcoming") => {
	try {
		const response = await axios.post(`${API_URL}/add`, null, {
			params: {
				name: task,
				category: category,
				taskDate: tdate,
			},
		});
		console.log('Task added successfully:', response.data);
	} catch (error) {
		console.error('Error adding task:', error);
	}
}

export const deleteTask = async (taskId) => {
	try {
		const response = await axios.delete(`${API_URL}/delete/${taskId}`);
		if (response.status === 204) {
			// Successful deletion, no content to return
			return true;
		} else {
			console.error('Error deleting task:', response.statusText);
			return false;
		}
	} catch (error) {
		console.error('Error deleting task:', error.message);
		return false;
	}
};