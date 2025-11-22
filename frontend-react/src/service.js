import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}`;

export const getTasks = (more = "") => {
	return axios.get(API_URL + "/all" + more)
		.then(response => {
			return response.data;
		})
		.catch(error => {
			console.error("Error fetching tasks:", error);
			throw error;
		});
};

export const updateField = async (id, field, value) => {
	try {
		const response = await axios.post(`${API_URL}/update`, null, {
			params: {
				id: id,
				field: field,
				value: value.toString(),
			},
		});
		return response.data.item;
	} catch (error) {
		console.error(`Error updating task with id ${id}:`, error);
		throw error;
	}
};

export const addTask = async (task, tdate, category = "None", priority = 0, repeatType = "NONE", repeatDuration = 0) => {
	try {
		const response = await axios.post(`${API_URL}/add`, null, {
			params: {
				name: task,
				category: category,
				taskDate: tdate,
				priority: priority,
				repeatType: repeatType,
				repeatDuration: repeatDuration,
			},
		});
		return response.data.item;
	} catch (error) {
		console.error('Error adding task:', error);
		return false;
	}
}

export const deleteTask = async (taskId) => {
	try {
		const response = await axios.delete(`${API_URL}/delete/${taskId}`);
		return response.data;
	} catch (error) {
		console.error('Error deleting task:', error.message);
		return false;
	}
};