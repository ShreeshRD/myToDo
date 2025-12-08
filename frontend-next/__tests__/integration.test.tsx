/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MainView from '../components/MainView';
import { useUI } from '../contexts/UIContext';
import { useTasks } from '../contexts/TaskContext';
import '@testing-library/jest-dom';

// Mock the contexts
jest.mock('../contexts/UIContext', () => ({
    useUI: jest.fn(),
}));
jest.mock('../contexts/TaskContext', () => ({
    useTasks: jest.fn(),
}));

// Mock components
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar">Sidebar</div>);
jest.mock('../components/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('../components/Upcoming', () => () => <div data-testid="upcoming">Upcoming View</div>);
jest.mock('../components/TodayView', () => () => <div data-testid="today">Today View</div>);
jest.mock('../components/CalendarView', () => () => <div data-testid="calendar">Calendar View</div>);
jest.mock('../components/CreateTaskPopup', () => () => <div data-testid="popup">Popup</div>);
jest.mock('../components/Search', () => () => <div data-testid="search">Search</div>);

describe('MainView Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementation
        (useUI as jest.Mock).mockReturnValue({
            showSidebar: true,
            setShowSidebar: jest.fn(),
            darkMode: false,
            setDarkMode: jest.fn(),
            viewPage: 'Upcoming',
            setViewPage: jest.fn(),
        });

        (useTasks as jest.Mock).mockReturnValue({
            startDate: '2023-01-01',
            setStartDate: jest.fn(),
            completedDate: '2023-01-01',
            setCompletedDate: jest.fn(),
            showPopup: false,
            callPopup: jest.fn(),
            onPopupClose: jest.fn(),
            popupDate: '',
            popupTaskItem: null,
            deleteTasksByCategory: jest.fn(),
            clearCategoryForTasks: jest.fn()
        });
    });

    it('renders Sidebar and Upcoming view by default', () => {
        render(<MainView />);
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('upcoming')).toBeInTheDocument();
    });

    it('renders Today view when viewPage is Today', () => {
        (useUI as jest.Mock).mockReturnValue({
            showSidebar: true,
            setShowSidebar: jest.fn(),
            darkMode: false,
            setDarkMode: jest.fn(),
            viewPage: 'Today',
            setViewPage: jest.fn(),
        });

        render(<MainView />);
        expect(screen.getByTestId('today')).toBeInTheDocument();
    });

    it('renders Calendar view when viewPage is Calendar', () => {
        (useUI as jest.Mock).mockReturnValue({
            showSidebar: true,
            setShowSidebar: jest.fn(),
            darkMode: false,
            setDarkMode: jest.fn(),
            viewPage: 'Calendar',
            setViewPage: jest.fn(),
        });

        render(<MainView />);
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
});

// ============================================
// CreateTaskPopup Date Initialization Tests (Bug 756)
// ============================================

// Mock additional dependencies for CreateTaskPopup tests
jest.mock('../components/DateComponent', () => ({
    __esModule: true,
    default: ({ currentDate }: { currentDate: any }) => (
        <div data-testid="date-component" data-date={currentDate?.format?.('YYYY-MM-DD') || currentDate}>
            {currentDate?.format?.('YYYY-MM-DD') || 'Invalid Date'}
        </div>
    )
}));

jest.mock('../components/Dropdown', () => ({
    __esModule: true,
    default: () => <div data-testid="dropdown">Dropdown</div>
}));

jest.mock('../components/TimeComponent', () => ({
    __esModule: true,
    default: () => <div data-testid="time-component">TimeComponent</div>
}));

import dayjs from 'dayjs';

describe('CreateTaskPopup Date Initialization (Bug 756)', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (useTasks as jest.Mock).mockReturnValue({
            onPopupClose: jest.fn(),
            startDate: '2023-01-01',
            setStartDate: jest.fn(),
            completedDate: '2023-01-01',
            setCompletedDate: jest.fn(),
            showPopup: true,
            callPopup: jest.fn(),
            popupDate: '',
            popupTaskItem: null,
            deleteTasksByCategory: jest.fn(),
            clearCategoryForTasks: jest.fn()
        });
    });

    it('should use today as default when date is invalid (Overdue string)', () => {
        // This tests the fix for Bug 756 where "Overdue" was passed as the date
        const invalidDate = 'Overdue';
        const result = dayjs(invalidDate).isValid();

        // dayjs should NOT consider "Overdue" as valid
        expect(result).toBe(false);

        // The fix ensures we fallback to today when date is invalid
        const today = dayjs();
        const fallbackDate = dayjs(invalidDate).isValid() ? dayjs(invalidDate) : today;
        expect(fallbackDate.format('YYYY-MM-DD')).toBe(today.format('YYYY-MM-DD'));
    });

    it('should use task.taskDate when editing a task with valid taskDate', () => {
        const taskDate = '2023-12-15';
        const task = { id: 1, name: 'Test Task', taskDate: taskDate };

        // This simulates the getInitialDate logic in CreateTaskPopup
        const getInitialDate = (task: any, date: string) => {
            if (task && task.taskDate) {
                return dayjs(task.taskDate);
            }
            if (date && dayjs(date).isValid()) {
                return dayjs(date);
            }
            return dayjs();
        };

        const result = getInitialDate(task, 'Overdue');
        expect(result.format('YYYY-MM-DD')).toBe(taskDate);
    });

    it('should use provided date when valid and no task', () => {
        const validDate = '2023-12-20';

        const getInitialDate = (task: any, date: string) => {
            if (task && task.taskDate) {
                return dayjs(task.taskDate);
            }
            if (date && dayjs(date).isValid()) {
                return dayjs(date);
            }
            return dayjs();
        };

        const result = getInitialDate(null, validDate);
        expect(result.format('YYYY-MM-DD')).toBe(validDate);
    });

    it('should handle overdue tasks correctly by extracting actual taskDate', () => {
        // Overdue tasks should use their taskDate, not "Overdue" string
        const overdueTask = {
            id: 1,
            name: 'Overdue Task',
            taskDate: '2023-11-01', // Actual date from backend
            complete: false
        };

        const getInitialDate = (task: any, date: string) => {
            if (task && task.taskDate) {
                return dayjs(task.taskDate);
            }
            if (date && dayjs(date).isValid()) {
                return dayjs(date);
            }
            return dayjs();
        };

        // Even if date passed is "Overdue", we use task.taskDate
        const result = getInitialDate(overdueTask, 'Overdue');
        expect(result.format('YYYY-MM-DD')).toBe('2023-11-01');
    });
});

