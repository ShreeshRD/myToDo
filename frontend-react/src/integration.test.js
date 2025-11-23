import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import dayjs from 'dayjs';

// Explicitly mock useUIState before importing TaskProvider
jest.mock('./hooks/useUIState', () => ({
  __esModule: true,
  default: () => ({
    showSidebar: true,
    setShowSidebar: jest.fn(),
    darkMode: false,
    setDarkMode: jest.fn(),
    viewPage: 'Today',
    setViewPage: jest.fn()
  })
}));

// Explicitly mock useTaskManagement before importing TaskProvider
jest.mock('./hooks/useTaskManagement', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    tasks: [],
    setTasks: jest.fn(),
    taskDays: {},
    setTaskDays: jest.fn(),
    completedTasks: [],
    setCompletedTasks: jest.fn(),
    overdueTasks: { overdue: [] },
    setOverdueTasks: jest.fn(),
    itemsByDate: {},
    setItemsByDate: jest.fn(),
    startDate: {
        format: () => '2023-10-26',
        add: () => ({ format: () => '2023-10-27' })
    },
    setStartDate: jest.fn(),
    addTask: jest.fn((name, taskDate) => {
        return {
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
    }),
    removeTask: jest.fn(),
    updateTask: jest.fn(),
    addToFrontend: jest.fn(),
    updateBackend: jest.fn(),
    fetchTasks: jest.fn(() => Promise.resolve({ itemsByDate: {}, completed: [] })),
    handleDragEnd: jest.fn()
  })
}));

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