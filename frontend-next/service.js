import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Fetches all tasks from the backend
 * @param {string} more - Additional query parameters
 * @returns {Promise<Array>} Array of tasks
 * @throws {Error} If the request fails
 */
export const getTasks = (more = "") => {
	return axios.get(API_URL + "/all" + more, {
		params: { _t: Date.now() },
		headers: { 'Cache-Control': 'no-cache' }
	})
		.then(response => {
			return response.data;
		})
		.catch(error => {
			console.error("Error fetching tasks:", error);
			throw error;
		});
};

class RequestQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await requestFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const nextRequest = this.queue.shift();
            try {
                await nextRequest();
            } catch (error) {
                console.error("Queue request failed:", error);
                // Continue processing other requests even if one fails
            }
        }

        this.isProcessing = false;
    }
}

const globalMutationQueue = new RequestQueue();

/**
 * Updates a specific field of a task
 * @param {number} id - Task ID
 * @param {string} field - Field name to update
 * @param {*} value - New value for the field
 * @returns {Promise<Object>} TodoOperationResult ({ status, item, warning, nextTask })
 * @throws {Error} If the update fails
 */
export const updateField = async (id, field, value) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/update`, null, {
				params: {
					id: id,
					field: field,
					value: value.toString(),
				},
			});
			return response.data;
		} catch (error) {
			console.error(`Error updating task with id ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Updates several fields of an existing task in one request, preserving its ID.
 * @param {number} id - Task ID
 * @param {Object} fields - Field name to value map
 * @returns {Promise<Object>} TodoOperationResult ({ status, item, warning, nextTask })
 * @throws {Error} If the update fails
 */
export const updateTaskFields = async (id, fields) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/patch/${id}`, fields);
			return response.data;
		} catch (error) {
			console.error(`Error patching task with id ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Pushes a task: marks it complete and creates a deferred copy on `date`.
 * @param {number} id - Task ID
 * @param {string} reason - Required reason
 * @param {string} date - Destination date (YYYY-MM-DD)
 * @returns {Promise<Object>} PushResult ({ status, original, clone })
 * @throws {Error} If the push fails
 */
export const pushTask = async (id, reason, date) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/push`, null, {
				params: { id, reason, date },
			});
			return response.data;
		} catch (error) {
			console.error(`Error pushing task ${id}:`, error);
			throw error;
		}
	});
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
export const addTask = async (task, tdate, category = "None", priority = 0, repeatType = "NONE", repeatDuration = 0, longTerm = false, goalId = null) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const params = {
				name: task,
				category: category,
				taskDate: tdate,
				priority: priority,
				repeatType: repeatType,
				repeatDuration: repeatDuration,
				longTerm: longTerm,
			};
			if (goalId != null) {
				params.goalId = goalId;
			}
			const response = await axios.post(`${API_URL}/add`, null, { params });
			return response.data.item;
		} catch (error) {
			console.error('Error adding task:', error);
			throw error;
		}
	});
}


/**
 * Deletes a task by ID
 * @param {number} taskId - Task ID to delete
 * @returns {Promise<boolean>} True if deletion was successful
 * @throws {Error} If the deletion fails
 */
export const deleteTask = async (taskId) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.delete(`${API_URL}/delete/${taskId}`);
			return response.data;
		} catch (error) {
			console.error('Error deleting task:', error.message);
			throw error;
		}
	});
};

/**
 * Fetches the activity timeline for a task
 * @param {number} taskId - Task ID
 * @returns {Promise<Array>} Ordered list of TaskEvent objects
 * @throws {Error} If the request fails
 */
export const getTaskEvents = async (taskId) => {
	try {
		const response = await axios.get(`${API_URL}/events/${taskId}`);
		return response.data;
	} catch (error) {
		console.error(`Error fetching events for task ${taskId}:`, error);
		throw error;
	}
};

/**
 * Fetches the embedded checklist for a task
 * @param {number} taskId - Task ID
 * @returns {Promise<Array>} Ordered list of Subtask objects
 * @throws {Error} If the request fails
 */
export const getSubtasks = async (taskId) => {
	try {
		const response = await axios.get(`${API_URL}/subtasks/${taskId}`);
		return response.data;
	} catch (error) {
		console.error(`Error fetching subtasks for task ${taskId}:`, error);
		throw error;
	}
};

/**
 * Fetches checklist counts for every task that has subtasks
 * @returns {Promise<Array>} List of {taskId, total, done}
 * @throws {Error} If the request fails
 */
export const getSubtaskCounts = async () => {
	try {
		const response = await axios.get(`${API_URL}/subtasks/counts/all`);
		return response.data;
	} catch (error) {
		console.error('Error fetching subtask counts:', error);
		throw error;
	}
};

/**
 * Adds a checklist row to a task
 * @param {number} taskId - Parent task ID
 * @param {string} title - Subtask text
 * @returns {Promise<Object>} Created Subtask
 * @throws {Error} If the request fails
 */
export const addSubtask = async (taskId, title) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/subtasks/${taskId}`, { title });
			return response.data;
		} catch (error) {
			console.error(`Error adding subtask to task ${taskId}:`, error);
			throw error;
		}
	});
};

/**
 * Updates a checklist row (title and/or done)
 * @param {number} id - Subtask ID
 * @param {Object} fields - Field name to value map
 * @returns {Promise<Object>} Updated Subtask
 * @throws {Error} If the request fails
 */
export const updateSubtask = async (id, fields) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.patch(`${API_URL}/subtasks/item/${id}`, fields);
			return response.data;
		} catch (error) {
			console.error(`Error updating subtask ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Persists a new checklist order
 * @param {number} taskId - Parent task ID
 * @param {number[]} ids - Subtask IDs in display order
 * @returns {Promise<Array>} Reordered Subtask list
 * @throws {Error} If the request fails
 */
export const reorderSubtasks = async (taskId, ids) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/subtasks/${taskId}/reorder`, ids);
			return response.data;
		} catch (error) {
			console.error(`Error reordering subtasks for task ${taskId}:`, error);
			throw error;
		}
	});
};

/**
 * Deletes a checklist row
 * @param {number} id - Subtask ID
 * @returns {Promise<void>}
 * @throws {Error} If the request fails
 */
export const deleteSubtask = async (id) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			await axios.delete(`${API_URL}/subtasks/item/${id}`);
		} catch (error) {
			console.error(`Error deleting subtask ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Deletes a goal (linked tasks are unlinked, longTerm kept)
 * @param {number} id - Goal ID
 * @returns {Promise<void>}
 * @throws {Error} If the request fails
 */
export const deleteGoal = async (id) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			await axios.delete(`${API_URL}/goals/${id}`);
		} catch (error) {
			console.error(`Error deleting goal ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Fetches all goals with live progress
 * @returns {Promise<Array>} List of GoalView objects
 * @throws {Error} If the request fails
 */
export const getGoals = async () => {
	try {
		const response = await axios.get(`${API_URL}/goals`);
		return response.data;
	} catch (error) {
		console.error('Error fetching goals:', error);
		throw error;
	}
};

/**
 * Fetches a single goal with live progress
 * @param {number} id - Goal ID
 * @returns {Promise<Object>} GoalView
 * @throws {Error} If the request fails
 */
export const getGoal = async (id) => {
	try {
		const response = await axios.get(`${API_URL}/goals/${id}`);
		return response.data;
	} catch (error) {
		console.error(`Error fetching goal ${id}:`, error);
		throw error;
	}
};

/**
 * Creates a goal
 * @param {string} title - Goal title
 * @param {string} [kind] - GOAL | SKILL
 * @param {string} [mode] - METRIC | ROADMAP | REPS
 * @returns {Promise<Object>} Created GoalView
 * @throws {Error} If the request fails
 */
export const createGoal = async (title, kind = "GOAL", mode = "METRIC") => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/goals`, { title, kind, mode });
			return response.data;
		} catch (error) {
			console.error('Error creating goal:', error);
			throw error;
		}
	});
};

/**
 * Updates goal fields (title, mode, metric*, repsTarget)
 * @param {number} id - Goal ID
 * @param {Object} fields - Field name to value map
 * @returns {Promise<Object>} Updated GoalView
 * @throws {Error} If the request fails
 */
export const updateGoal = async (id, fields) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.patch(`${API_URL}/goals/${id}`, fields);
			return response.data;
		} catch (error) {
			console.error(`Error updating goal ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Manually completes (archives) a goal
 * @param {number} id - Goal ID
 * @returns {Promise<Object>} GoalView
 * @throws {Error} If the request fails
 */
export const completeGoal = async (id) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/goals/${id}/complete`);
			return response.data;
		} catch (error) {
			console.error(`Error completing goal ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Reopens a completed goal
 * @param {number} id - Goal ID
 * @returns {Promise<Object>} GoalView
 * @throws {Error} If the request fails
 */
export const reopenGoal = async (id) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const response = await axios.post(`${API_URL}/goals/${id}/reopen`);
			return response.data;
		} catch (error) {
			console.error(`Error reopening goal ${id}:`, error);
			throw error;
		}
	});
};

/**
 * Fetches tasks linked to a goal
 * @param {number} id - Goal ID
 * @returns {Promise<Array>} List of TodoItem
 * @throws {Error} If the request fails
 */
export const getGoalTasks = async (id) => {
	try {
		const response = await axios.get(`${API_URL}/goals/${id}/tasks`);
		return response.data;
	} catch (error) {
		console.error(`Error fetching tasks for goal ${id}:`, error);
		throw error;
	}
};

/**
 * Creates a roadmap step (goal-linked task with roadmapOrder).
 * @param {number} goalId - Goal ID
 * @param {string} name - Step name
 * @param {string|null} [date] - YYYY-MM-DD, or null/undefined for backlog
 * @returns {Promise<Object>} TodoItem
 * @throws {Error} If the request fails
 */
export const addRoadmapStep = async (goalId, name, date = null) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			const body = { name };
			if (date) body.date = date;
			const response = await axios.post(`${API_URL}/goals/${goalId}/roadmap/steps`, body);
			return response.data;
		} catch (error) {
			console.error(`Error adding roadmap step to goal ${goalId}:`, error);
			throw error;
		}
	});
};

/**
 * Reorders all roadmap steps of a goal.
 * @param {number} goalId - Goal ID
 * @param {number[]} orderedIds - Full ordered list of step task IDs
 * @returns {Promise<void>}
 * @throws {Error} If the request fails
 */
export const reorderRoadmap = async (goalId, orderedIds) => {
	return globalMutationQueue.enqueue(async () => {
		try {
			await axios.post(`${API_URL}/goals/${goalId}/roadmap/reorder`, orderedIds);
		} catch (error) {
			console.error(`Error reordering roadmap for goal ${goalId}:`, error);
			throw error;
		}
	});
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
