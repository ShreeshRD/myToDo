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
