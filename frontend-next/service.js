import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Fetches all tasks from the backend
 * @param {string} more - Additional query parameters
 * @returns {Promise<Array>} Array of tasks
 * @throws {Error} If the request fails
 */
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

/**
 * Updates a specific field of a task
 * @param {number} id - Task ID
 * @param {string} field - Field name to update
 * @param {*} value - New value for the field
 * @returns {Promise<Object>} Updated task item
 * @throws {Error} If the update fails
 */
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

/**
 * Adds a new task to the backend
 * @param {string} task - Task name
 * @param {string} tdate - Task date in YYYY-MM-DD format
 * @param {string} category - Task category
 * @param {number} priority - Task priority (0-4)
 * @param {string} repeatType - Repeat pattern type
 * @param {number} repeatDuration - Repeat duration value
 * @returns {Promise<Object>} Created task item
 * @throws {Error} If the creation fails
 */
export const addTask = async (task, tdate, category = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, longTerm = false) => {
	try {
		const response = await axios.post(`${API_URL}/add`, null, {
			params: {
				name: task,
				category: category,
				taskDate: tdate,
				priority: priority,
				repeatType: repeatType,
				repeatDuration: repeatDuration,
				longTerm: longTerm,
			},
		});
		return response.data.item;
	} catch (error) {
		console.error('Error adding task:', error);
		throw error;
	}
}


/**
 * Deletes a task by ID
 * @param {number} taskId - Task ID to delete
 * @returns {Promise<boolean>} True if deletion was successful
 * @throws {Error} If the deletion fails
 */
export const deleteTask = async (taskId) => {
	try {
		const response = await axios.delete(`${API_URL}/delete/${taskId}`);
		return response.data;
	} catch (error) {
		console.error('Error deleting task:', error.message);
		throw error;
	}
};

/**
 * Fetches the scratchpad content
 * @returns {Promise<Object>} Scratchpad object with content string
 */
export const getScratchpad = async () => {
	try {
		const response = await axios.get(`${API_URL}/scratchpad`);
		return response.data;
	} catch (error) {
		console.error('Error fetching scratchpad:', error);
		throw error;
	}
};

/**
 * Saves the scratchpad content
 * @param {string} content - JSON string of blocks
 * @returns {Promise<Object>} Saved scratchpad object
 */
export const saveScratchpad = async (content) => {
	try {
		const response = await axios.post(`${API_URL}/scratchpad`, content, {
			headers: {
				'Content-Type': 'text/plain'
			}
		});
		return response.data;
	} catch (error) {
		console.error('Error saving scratchpad:', error);
		throw error;
	}
};
