import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import dayjs from 'dayjs';

// Explicitly mock useUIState before importing TaskProvider
jest.mock('./hooks/useUIState', () => {
  return jest.fn(() => ({
    showSidebar: true,
    setShowSidebar: jest.fn(),
    darkMode: false,
    setDarkMode: jest.fn(),
    viewPage: 'Today',
    setViewPage: jest.fn()
  }));
});

// Explicitly mock useTaskManagement before importing TaskProvider
jest.mock('./hooks/useTaskManagement', () => {
  const useState = React.useState; // Use React's useState for the mock
  return jest.fn(() => {
    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [itemsByDate, setItemsByDate] = useState({});

    const addTask = (name, taskDate) => {
        const newTask = {
            id: Math.floor(Math.random() * 1000),
            name,
            taskDate,
            category: 'None',
            priority: 0,
            repeatType: 'NONE',
            repeatDuration: 0,
            dayOrder: 0,
            complete: false
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
        setItemsByDate(prevItemsByDate => {
            const newItemsByDate = { ...prevItemsByDate };
            const date = newTask.taskDate;
            if (!newItemsByDate[date]) {
                newItemsByDate[date] = [];
            }
            newItemsByDate[date].push(newTask);
            return newItemsByDate;
        });
        return newTask;
    };

    const removeTask = (taskId, taskDate, isComplete) => {
        if (isComplete) {
            setCompletedTasks(prevCompletedTasks => prevCompletedTasks.filter(task => task.id !== taskId));
        } else {
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
            setItemsByDate(prevItemsByDate => {
                const newItemsByDate = { ...prevItemsByDate };
                if (newItemsByDate[taskDate]) {
                    newItemsByDate[taskDate] = newItemsByDate[taskDate].filter(task => task.id !== taskId);
                }
                return newItemsByDate;
            });
        }
    };

    const updateTask = (updatedTask) => {
        setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
        setItemsByDate(prevItemsByDate => {
            const newItemsByDate = { ...prevItemsByDate };
            const date = updatedTask.taskDate;
            if (newItemsByDate[date]) {
                newItemsByDate[date] = newItemsByDate[date].map(task => task.id === updatedTask.id ? updatedTask : task);
            }
            return newItemsByDate;
        });
    };

    const addToFrontend = (task) => {
        if (!task || !task.taskDate) {
            console.warn("Invalid task object in addToFrontend:", task);
            return;
        }
        setTasks(prevTasks => [...prevTasks, task]);
        setItemsByDate(prevItemsByDate => {
            const newItemsByDate = { ...prevItemsByDate };
            const date = task.taskDate;
            if (!newItemsByDate[date]) {
                newItemsByDate[date] = [];
            }
            newItemsByDate[date].push(task);
            return newItemsByDate;
        });
    };

    const updateBackend = jest.fn();
    const fetchTasks = jest.fn(() => Promise.resolve({ itemsByDate: {}, completed: [] }));

    return {
        tasks,
        setTasks,
        completedTasks,
        setCompletedTasks,
        itemsByDate,
        setItemsByDate,
        addTask,
        removeTask,
        updateTask,
        addToFrontend,
        updateBackend,
        fetchTasks
    };
  });
});

import { TaskProvider } from './contexts/TaskContext';

// Mocking the service functions
jest.mock('./service', () => {
  const dayjs = require('dayjs');
  const today = dayjs().format('YYYY-MM-DD');
  return {
    getTasks: jest.fn(() => Promise.resolve({ 
      itemsByDate: { [today]: [] },
      completed: []
    })),
    updateField: jest.fn((id, field, value) => Promise.resolve({ 
      item: { id, [field]: value } 
    })),
    deleteTask: jest.fn(() => Promise.resolve({})),
    addTask: jest.fn((name, taskDate) => Promise.resolve({
      id: Math.floor(Math.random() * 1000), 
      name, 
      taskDate, 
      category: 'None', 
      priority: 0, 
      repeatType: 'NONE', 
      repeatDuration: 0, 
      dayOrder: 0, 
      complete: false 
    }))
  }
});

describe('Integration Tests', () => {
  test('full task lifecycle: create, view, and complete a task', async () => {
    render(
      <TaskProvider>
        <App />
      </TaskProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    // Click the "Add Task" button in the sidebar
    const addTaskButton = screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'span' && content.startsWith('Add Task');
    });
    fireEvent.click(addTaskButton);

    // Create a new task
    const taskNameInput = screen.getByPlaceholderText('Task Name');
    const addButton = screen.getByTestId('add-task-btn');

    fireEvent.change(taskNameInput, { target: { value: 'My New Integrated Task' } });
    fireEvent.click(addButton);

    // Wait for the task to appear in the list
    const taskElement = await screen.findByText('My New Integrated Task');
    expect(taskElement).toBeInTheDocument();

    // Find the checkbox for the task and click it
    // The checkbox doesn't have the exact test ID we're looking for, so we'll find it by role
    const checkbox = screen.getByRole('checkbox', { name: '' });
    fireEvent.click(checkbox);

    // Wait for the task to be marked as completed (strikethrough)
    await waitFor(() => {
      expect(taskElement).toHaveClass('strikethrough');
    });
  });
});