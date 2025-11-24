const axios = require('axios');

const API_URL = 'http://localhost:8080/todo';

async function addPastTask() {
    try {
        // 1. Add Task
        console.log("Adding task...");
        const addResponse = await axios.post(`${API_URL}/add`, null, {
            params: {
                name: "Past Completed Task 09:00",
                category: "None",
                taskDate: "2025-11-24",
                priority: 0,
                repeatType: "NONE",
                repeatDuration: 0,
            }
        });
        const task = addResponse.data.item;
        console.log("Task added with ID:", task.id);

        // 2. Update Assigned Time to 09:00
        console.log("Updating assigned time...");
        await axios.post(`${API_URL}/update`, null, {
            params: {
                id: task.id,
                field: "assignedTime",
                value: "09:00:00"
            }
        });

        // 3. Update Complete to true
        console.log("Marking as complete...");
        await axios.post(`${API_URL}/update`, null, {
            params: {
                id: task.id,
                field: "complete",
                value: "true"
            }
        });

        console.log("Success! Task created, assigned to 09:00, and completed.");

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

addPastTask();
