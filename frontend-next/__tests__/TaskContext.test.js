
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TaskProvider, useTasks } from '../contexts/TaskContext';
import * as service from '../service';
import useTaskManagement from '../hooks/useTaskManagement';

// Mock dependencies
jest.mock('../service', () => ({
    addTask: jest.fn(),
    updateTaskFields: jest.fn(),
    getSubtaskCounts: jest.fn(),
}));

jest.mock('../hooks/useTaskManagement', () => jest.fn());

jest.mock('../contexts/UIContext', () => ({
    useUI: () => ({
        darkMode: false,
    }),
}));

describe('TaskContext', () => {
    let mockUpdateBackend;
    let mockRemoveTask;
    let mockAddToFrontend;
    let mockFetchTasks;

    beforeEach(() => {
        mockUpdateBackend = jest.fn();
        mockRemoveTask = jest.fn();
        mockAddToFrontend = jest.fn();
        mockFetchTasks = jest.fn();

        useTaskManagement.mockReturnValue({
            taskDays: {},
            completedTasks: {},
            overdueTasks: { overdue: [] },
            updateBackend: mockUpdateBackend,
            removeTask: mockRemoveTask,
            addToFrontend: mockAddToFrontend,
            fetchTasks: mockFetchTasks,
            updateTask: jest.fn(),
            startDate: { add: jest.fn() }, // minimal mock for moment/dayjs
        });

        service.addTask.mockResolvedValue({
            id: 123,
            name: 'Test Task',
        });
        service.updateTaskFields.mockResolvedValue({
            id: 1,
            name: 'Updated Task',
        });
        service.getSubtaskCounts.mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update an existing task in place instead of recreating it', async () => {
        const wrapper = ({ children }) => <TaskProvider>{children}</TaskProvider>;
        const { result } = renderHook(() => useTasks(), { wrapper });

        const taskID = 1;
        const taskName = 'Updated Task';
        const dateChoice = '2025-12-21';
        const projectChoice = 'Work';
        const priority = 1;
        const repeatType = 'NONE';
        const repeatDuration = 0;
        const taskOrder = 5;
        const assignedTime = null;

        await act(async () => {
            await result.current.onPopupClose(
                taskID,
                taskName,
                dateChoice,
                projectChoice,
                priority,
                repeatType,
                repeatDuration,
                taskOrder,
                assignedTime,
                true,
                3600,
                true
            );
        });

        expect(service.addTask).not.toHaveBeenCalled();
        expect(service.updateTaskFields).toHaveBeenCalledWith(taskID, {
            taskName,
            taskDate: dateChoice,
            category: projectChoice,
            priority: String(priority),
            repeatType,
            repeatDuration: String(repeatDuration),
            dayOrder: String(taskOrder),
            assignedTime: 'null',
        });
        expect(mockFetchTasks).toHaveBeenCalled();
    });
});
