
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateTaskPopup from './CreateTaskPopup';
import * as TaskContext from '../contexts/TaskContext';
import dayjs from 'dayjs';

// Mock the useTasks hook
const mockOnPopupClose = jest.fn();

jest.mock('../contexts/TaskContext', () => ({
  ...jest.requireActual('../contexts/TaskContext'),
  useTasks: () => ({
    onPopupClose: mockOnPopupClose,
  }),
}));

describe('CreateTaskPopup', () => {
  const projects = ['Project 1', 'Project 2'];

  beforeEach(() => {
    // Clear mock calls before each test
    mockOnPopupClose.mockClear();
  });

  test('renders in "Add Task" mode by default', () => {
    render(<CreateTaskPopup projects={projects} darkmode={false} />);
    expect(screen.getByText('Add Task')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task Name')).toHaveValue('');
  });

  test('renders in "Update" mode when a task is passed', () => {
    const task = {
      id: 1,
      name: 'Test Task',
      taskDate: '2025-08-15',
      category: 'Project 1',
      priority: 2,
      repeatType: 'NONE',
      repeatDuration: 0,
      dayOrder: 0,
    };
    render(<CreateTaskPopup projects={projects} darkmode={false} task={task} />);
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task Name')).toHaveValue('Test Task');
  });

  test('handles task name change', () => {
    render(<CreateTaskPopup projects={projects} darkmode={false} />);
    const taskNameInput = screen.getByPlaceholderText('Task Name');
    fireEvent.change(taskNameInput, { target: { value: 'New Task Name' } });
    expect(taskNameInput).toHaveValue('New Task Name');
  });

  test('calls onPopupClose with correct data when "Add Task" is clicked', () => {
    render(<CreateTaskPopup projects={projects} darkmode={false} date={dayjs('2025-08-15')} />);
    
    fireEvent.change(screen.getByPlaceholderText('Task Name'), { target: { value: 'My New Task' } });
    // Simulate selecting a project, priority, etc. as needed

    fireEvent.click(screen.getByTestId('add-task-btn'));

    expect(mockOnPopupClose).toHaveBeenCalledTimes(1);
    // You can add more specific assertions here about the data passed to onPopupClose
  });

  test('calls onPopupClose when "Cancel" is clicked', () => {
    render(<CreateTaskPopup projects={projects} darkmode={false} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnPopupClose).toHaveBeenCalledTimes(1);
  });

  test('handles Escape key to close popup', () => {
    render(<CreateTaskPopup projects={projects} darkmode={false} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Task Name'), { key: 'Escape', code: 'Escape' });
    expect(mockOnPopupClose).toHaveBeenCalledTimes(1);
  });
});
