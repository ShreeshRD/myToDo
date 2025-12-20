
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TaskProvider, useTasks } from '../contexts/TaskContext';
import * as service from '../service';
import useTaskManagement from '../hooks/useTaskManagement';

// Mock dependencies
jest.mock('../service', () => ({
    addTask: jest.fn(),
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

    beforeEach(() => {
        mockUpdateBackend = jest.fn();
        mockRemoveTask = jest.fn();
        mockAddToFrontend = jest.fn();

        useTaskManagement.mockReturnValue({
            taskDays: {},
            completedTasks: {},
            overdueTasks: { overdue: [] },
            updateBackend: mockUpdateBackend,
            removeTask: mockRemoveTask,
            addToFrontend: mockAddToFrontend,
            startDate: { add: jest.fn() }, // minimal mock for moment/dayjs
        });

        service.addTask.mockResolvedValue({
            id: 123,
            name: 'Test Task',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should persist inProgress, timeTaken, and longTerm when updating a task', async () => {
        const wrapper = ({ children }) => <TaskProvider>{children}</TaskProvider>;
        const { result } = renderHook(() => useTasks(), { wrapper });

        const taskID = 1;
        const taskDate = '2025-12-20';
        const taskName = 'Updated Task';
        const dateChoice = '2025-12-21';
        const projectChoice = 'Work';
        const priority = 1;
        const repeatType = 'NONE';
        const repeatDuration = 0;
        const taskOrder = 5;
        const assignedTime = null;
        const inProgress = true;
        const timeTaken = 3600;
        const longTerm = true;

        await act(async () => {
            await result.current.onPopupClose(
                taskID,
                taskDate,
                taskName,
                dateChoice,
                projectChoice,
                priority,
                repeatType,
                repeatDuration,
                taskOrder,
                assignedTime,
                inProgress,
                timeTaken,
                longTerm
            );
        });

        // Verify addTask was called with longTerm
        expect(service.addTask).toHaveBeenCalledWith(
            taskName,
            dateChoice,
            projectChoice,
            priority,
            repeatType,
            repeatDuration,
            longTerm
        );

        // Verify updateBackend was called for inProgress
        expect(mockUpdateBackend).toHaveBeenCalledWith(123, 'inProgress', true);

        // Verify updateBackend was called for timeTaken
        expect(mockUpdateBackend).toHaveBeenCalledWith(123, 'timeTaken', timeTaken);
    });
});
