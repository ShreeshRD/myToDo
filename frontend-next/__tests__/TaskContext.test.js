
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TaskProvider, useTasks } from '../contexts/TaskContext';
import * as service from '../service';
import useTaskManagement from '../hooks/useTaskManagement';

// Mock dependencies
jest.mock('../service', () => ({
    addTask: jest.fn(),
    editTask: jest.fn(),
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
            // onPopupClose refetches after editing a task
            fetchTasks: mockFetchTasks,
            startDate: { add: jest.fn() }, // minimal mock for moment/dayjs
        });

        service.addTask.mockResolvedValue({
            id: 123,
            name: 'Test Task',
        });
        service.editTask.mockResolvedValue({
            id: 1,
            name: 'Updated Task',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const wrapper = ({ children }) => <TaskProvider>{children}</TaskProvider>;

    it('edits an existing task in place instead of deleting and re-creating it', async () => {
        const { result } = renderHook(() => useTasks(), { wrapper });

        await act(async () => {
            await result.current.onPopupClose(
                1, '2025-12-20', 'Updated Task', '2025-12-21', 'Work', 1, 'NONE', 0, 5,
                '09:00:00', true, 3600, true, 15
            );
        });

        expect(service.editTask).toHaveBeenCalledWith(
            1, 'Updated Task', '2025-12-21', 'Work', 1, 'NONE', 0, true, '09:00:00', 15
        );
        expect(service.addTask).not.toHaveBeenCalled();
        expect(mockRemoveTask).not.toHaveBeenCalled();
        // Progress lives on the existing row, so it is not re-sent
        expect(mockUpdateBackend).not.toHaveBeenCalled();
        expect(mockFetchTasks).toHaveBeenCalled();
    });

    it('drops the reminder when an edited task has no time', async () => {
        const { result } = renderHook(() => useTasks(), { wrapper });

        await act(async () => {
            await result.current.onPopupClose(
                1, '2025-12-20', 'Updated Task', '2025-12-21', 'Work', 1, 'NONE', 0, 5,
                null, false, 0, false, 15
            );
        });

        expect(service.editTask).toHaveBeenCalledWith(
            1, 'Updated Task', '2025-12-21', 'Work', 1, 'NONE', 0, false, null, null
        );
    });

    it('persists inProgress and timeTaken when creating a task', async () => {
        const { result } = renderHook(() => useTasks(), { wrapper });

        await act(async () => {
            await result.current.onPopupClose(
                -1, '2025-12-20', 'New Task', '2025-12-21', 'Work', 1, 'NONE', 0, 0,
                null, true, 3600, true
            );
        });

        expect(service.addTask).toHaveBeenCalledWith(
            'New Task', '2025-12-21', 'Work', 1, 'NONE', 0, true, null, null
        );
        expect(service.editTask).not.toHaveBeenCalled();
        expect(mockUpdateBackend).toHaveBeenCalledWith(123, 'inProgress', true);
        expect(mockUpdateBackend).toHaveBeenCalledWith(123, 'timeTaken', 3600);
        expect(mockAddToFrontend).toHaveBeenCalledWith(expect.objectContaining({ id: 123 }));
    });
});
