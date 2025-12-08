/**
 * Unit tests for useTaskManagement hook
 * Tests for bug fixes related to recurring tasks and task updates
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the service module
jest.mock('../service', () => ({
    getTasks: jest.fn(),
    updateField: jest.fn(),
    deleteTask: jest.fn(),
    addTask: jest.fn(),
}));

// Import after mocking
import useTaskManagement from '../hooks/useTaskManagement';
import { getTasks, updateField, deleteTask, addTask } from '../service';
import dayjs from 'dayjs';

// Define interfaces for type safety
interface Task {
    id: number;
    name: string;
    complete: boolean;
    taskDate: string;
    category?: string;
    repeatType?: string;
    repeatDuration?: number;
    dayOrder?: number;
    [key: string]: unknown;
}

interface TaskManagementHook {
    taskDays: Record<string, Task[]>;
    completedTasks: Record<string, Task[]>;
    overdueTasks: { overdue: Task[] };
    updateTask: (id: number | string, field: string, value: unknown, date: string) => Promise<void>;
    addNextRepeat: (task: Task) => Promise<void>;
    moveTask: (taskId: string, destDate: string, predecessorTaskId: string | null) => void;
    removeTask: (taskId: number, date: string, update?: boolean) => Promise<void>;
    fetchTasks: () => Promise<void>;
    [key: string]: unknown;
}

describe('useTaskManagement Hook', () => {
    const mockGetTasks = getTasks as jest.Mock;
    const mockUpdateField = updateField as jest.Mock;
    const mockDeleteTask = deleteTask as jest.Mock;
    const mockAddTask = addTask as jest.Mock;

    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTasks.mockResolvedValue({
            itemsByDate: {}
        });
    });

    describe('fetchTasks', () => {
        it('should separate completed and incomplete tasks correctly', async () => {
            const mockTasks = {
                itemsByDate: {
                    [today]: [
                        { id: 1, name: 'Complete Task', complete: true, taskDate: today },
                        { id: 2, name: 'Incomplete Task', complete: false, taskDate: today },
                    ],
                    [yesterday]: [
                        { id: 3, name: 'Overdue Task', complete: false, taskDate: yesterday },
                        { id: 4, name: 'Past Complete', complete: true, taskDate: yesterday },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toBeDefined();
            });

            // Both complete and incomplete tasks should be in taskDays for today (Bug fix verification)
            expect(result.current.taskDays[today]).toHaveLength(2);

            // Completed tasks should also be in completedTasks
            expect(result.current.completedTasks[today]).toBeDefined();
            expect(result.current.completedTasks[today]).toHaveLength(1);

            // Overdue incomplete tasks should be in overdueTasks
            expect(result.current.overdueTasks.overdue).toHaveLength(1);
            expect(result.current.overdueTasks.overdue[0].id).toBe(3);
        });

        it('should handle empty response gracefully', async () => {
            mockGetTasks.mockResolvedValue({ itemsByDate: {} });

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(mockGetTasks).toHaveBeenCalled();
            });

            // Initial state can be [] or {} depending on hook initialization
            const taskDays = result.current.taskDays;
            const isEmpty = Array.isArray(taskDays)
                ? taskDays.length === 0
                : Object.keys(taskDays).length === 0;
            expect(isEmpty).toBe(true);
            expect(result.current.overdueTasks.overdue).toEqual([]);
        });
    });

    describe('updateTask', () => {
        it('should update task in place when marking as complete', async () => {
            const mockTasks = {
                itemsByDate: {
                    [today]: [
                        { id: 1, name: 'Task 1', complete: false, taskDate: today, repeatType: 'NONE' },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockUpdateField.mockResolvedValue({
                id: 1,
                name: 'Task 1',
                complete: true,
                taskDate: today,
                repeatType: 'NONE',
                assignedTime: '12:00:00'
            });

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toBeDefined();
            });

            await act(async () => {
                await result.current.updateTask(1, 'complete', true, today);
            });

            // Task should be updated in taskDays
            expect(result.current.taskDays[today][0].complete).toBe(true);

            // Task should also appear in completedTasks
            expect(result.current.completedTasks[today]).toHaveLength(1);
        });

        it('should update category without creating duplicate (Bug 417)', async () => {
            const mockTasks = {
                itemsByDate: {
                    [today]: [
                        { id: 1, name: 'Task 1', complete: true, category: 'OldProject', taskDate: today },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockUpdateField.mockResolvedValue({
                id: 1,
                name: 'Task 1',
                complete: true,
                category: 'NewProject',
                taskDate: today
            });

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toBeDefined();
            });

            await act(async () => {
                await result.current.updateTask(1, 'category', 'NewProject', today);
            });

            // Should still only have one task (no duplicate)
            expect(result.current.taskDays[today]).toHaveLength(1);
            expect(result.current.taskDays[today][0].category).toBe('NewProject');
        });

        it('should update overdue task correctly', async () => {
            const mockTasks = {
                itemsByDate: {
                    [yesterday]: [
                        { id: 1, name: 'Overdue Task', complete: false, taskDate: yesterday },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockUpdateField.mockResolvedValue({
                id: 1,
                name: 'Updated Overdue',
                complete: false,
                taskDate: yesterday
            });

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.overdueTasks.overdue).toHaveLength(1);
            });

            await act(async () => {
                await result.current.updateTask(1, 'taskName', 'Updated Overdue', yesterday);
            });

            expect(result.current.overdueTasks.overdue[0].taskName).toBe('Updated Overdue');
        });
    });

    describe('addNextRepeat - Bug 802 duplicate prevention', () => {
        it('should NOT create duplicate recurring task when one already exists', async () => {
            const existingTask = {
                id: 1,
                name: 'Recurring Task',
                category: 'Work',
                complete: true,
                taskDate: today,
                repeatType: 'EVERY_X_DAYS',
                repeatDuration: 1
            };

            // Task already exists for tomorrow
            const mockTasks = {
                itemsByDate: {
                    [today]: [existingTask],
                    [tomorrow]: [
                        { id: 2, name: 'Recurring Task', category: 'Work', complete: false, taskDate: tomorrow }
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toBeDefined();
            });

            // Attempt to add next repeat - should be prevented by duplicate check
            await act(async () => {
                await result.current.addNextRepeat(existingTask);
            });

            // addTask should NOT have been called since task already exists
            expect(mockAddTask).not.toHaveBeenCalled();
        });

        it('should create new recurring task when none exists for target date', async () => {
            const task = {
                id: 1,
                name: 'Recurring Task',
                category: 'Work',
                complete: true,
                taskDate: today,
                repeatType: 'EVERY_X_DAYS',
                repeatDuration: 1
            };

            const mockTasks = {
                itemsByDate: {
                    [today]: [task]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockAddTask.mockResolvedValue({
                id: 2,
                name: 'Recurring Task',
                category: 'Work',
                taskDate: tomorrow
            });

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toBeDefined();
            });

            await act(async () => {
                await result.current.addNextRepeat(task);
            });

            // addTask should have been called
            expect(mockAddTask).toHaveBeenCalledWith(
                'Recurring Task',
                tomorrow,
                'Work',
                undefined,
                'EVERY_X_DAYS',
                1
            );
        });
    });

    describe('moveTask - Bug 652 reordering fix', () => {
        it('should correctly reorder tasks within same date', async () => {
            const mockTasks = {
                itemsByDate: {
                    [today]: [
                        { id: 1, name: 'Task 1', dayOrder: 1, taskDate: today },
                        { id: 2, name: 'Task 2', dayOrder: 2, taskDate: today },
                        { id: 3, name: 'Task 3', dayOrder: 3, taskDate: today },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toHaveLength(3);
            });

            // Move task 1 after task 2
            await act(async () => {
                result.current.moveTask('1', today, '2');
            });

            // Verify updateField was called for dayOrder updates
            expect(mockUpdateField).toHaveBeenCalled();
        });

        it('should move overdue task to current date', async () => {
            const mockTasks = {
                itemsByDate: {
                    [yesterday]: [
                        { id: 1, name: 'Overdue Task', dayOrder: 1, taskDate: yesterday, complete: false },
                    ],
                    [today]: []
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.overdueTasks.overdue).toHaveLength(1);
            });

            await act(async () => {
                result.current.moveTask('1', today, null);
            });

            // Task should be removed from overdue
            expect(result.current.overdueTasks.overdue).toHaveLength(0);

            // Task should be added to today
            expect(result.current.taskDays[today]).toHaveLength(1);
        });
    });

    describe('removeTask', () => {
        it('should remove incomplete task from taskDays', async () => {
            const mockTasks = {
                itemsByDate: {
                    [today]: [
                        { id: 1, name: 'Task 1', complete: false, taskDate: today, dayOrder: 1 },
                        { id: 2, name: 'Task 2', complete: false, taskDate: today, dayOrder: 2 },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockDeleteTask.mockResolvedValue(false); // false = was incomplete

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.taskDays[today]).toHaveLength(2);
            });

            await act(async () => {
                await result.current.removeTask(1, today);
            });

            expect(result.current.taskDays[today]).toHaveLength(1);
            expect(result.current.taskDays[today][0].id).toBe(2);
        });

        it('should remove overdue task from overdueTasks', async () => {
            const mockTasks = {
                itemsByDate: {
                    [yesterday]: [
                        { id: 1, name: 'Overdue Task', complete: false, taskDate: yesterday },
                    ]
                }
            };
            mockGetTasks.mockResolvedValue(mockTasks);
            mockDeleteTask.mockResolvedValue(false);

            const { result } = renderHook(() => useTaskManagement()) as unknown as { result: { current: TaskManagementHook } };

            await waitFor(() => {
                expect(result.current.overdueTasks.overdue).toHaveLength(1);
            });

            await act(async () => {
                await result.current.removeTask(1, yesterday);
            });

            expect(result.current.overdueTasks.overdue).toHaveLength(0);
        });
    });
});
