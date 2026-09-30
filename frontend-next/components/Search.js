'use client'

import React, { useState, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { Pagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import dayjs from 'dayjs';
import { projectColor } from '../lib/projectColors';
import styles from './Search.module.css';

function Search() {
    const { taskDays, completedTasks, overdueTasks, callPopup } = useTasks();
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const allTasks = [
        ...Object.values(taskDays).flat(),
        ...Object.values(completedTasks).flat(),
        ...(overdueTasks.overdue || [])
    ];

    // Deduplicate tasks by ID
    const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values());

    const filteredTasks = uniqueTasks.filter(task => {
        if (activeFilter === 'All' && !query.trim()) return false;

        const matchesQuery = task.name.toLowerCase().includes(query.toLowerCase());
        if (!matchesQuery) return false;

        if (activeFilter === 'Completed') return task.complete;
        if (activeFilter === 'Active') return !task.complete;
        if (activeFilter === 'Recurring') return task.repeatType && task.repeatType !== 'NONE';
        if (activeFilter === 'Project') return task.category && task.category !== 'None';
        return true;
    });

    // Reset page when filter or query changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [query, activeFilter]);

    // Sort tasks: Category -> Date -> Time
    filteredTasks.sort((a, b) => {
        // 1. Category
        const catA = a.category || '';
        const catB = b.category || '';
        if (catA !== catB) {
            if (catA === 'None' || !catA) return 1; // Put no category at bottom
            if (catB === 'None' || !catB) return -1;
            return catA.localeCompare(catB);
        }

        // 2. Date
        const dateA = dayjs(a.taskDate);
        const dateB = dayjs(b.taskDate);
        if (!dateA.isSame(dateB, 'day')) {
            return dateA.diff(dateB);
        }

        // 3. Time
        const timeA = a.assignedTime || '00:00';
        const timeB = b.assignedTime || '00:00';
        return timeA.localeCompare(timeB);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = filteredTasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const getStatusText = (task) => {
        if (task.complete) return 'Completed';
        if (dayjs(task.taskDate).isBefore(dayjs(), 'day')) return 'Overdue';
        return 'Active';
    };

    const filters = ['All', 'Completed', 'Active', 'Recurring', 'Project'];

    const isOverdue = (task) => !task.complete && dayjs(task.taskDate).isBefore(dayjs(), 'day');

    const handleTaskClick = (task) => {
        callPopup(task.taskDate, task);
    };

    const handleRowKeyDown = (event, task) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleTaskClick(task);
        }
    };

    const hasCriteria = activeFilter !== 'All' || query.trim();

    return (
        <div className={styles.searchContainer}>
            {/* Search Bar */}
            <label className={styles.searchBar}>
                <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search tasks, projects, or dates..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search tasks"
                />
            </label>

            {/* Filter segmented control */}
            <div className={styles.filterContainer} role="tablist" aria-label="Filter">
                {filters.map(filter => {
                    const isActive = activeFilter === filter;
                    return (
                        <button
                            key={filter}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveFilter(filter)}
                            className={`${styles.filterChip}${isActive ? ` ${styles.active}` : ''}`}
                        >
                            {filter}
                        </button>
                    );
                })}
                {filteredTasks.length > 0 && (
                    <span className={styles.resultCount}>
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'result' : 'results'}
                    </span>
                )}
            </div>

            <ul className={styles.taskList}>
                {paginatedTasks.map((task, index) => {
                    const taskOverdue = isOverdue(task);
                    const statusText = getStatusText(task);
                    const statusClass = task.complete ? styles.completed : (taskOverdue ? styles.overdue : styles.activeStatus);

                    return (
                        <li
                            key={task.id || index}
                            className={styles.taskPaper}
                            onClick={() => handleTaskClick(task)}
                            onKeyDown={(e) => handleRowKeyDown(e, task)}
                            tabIndex={0}
                        >
                            <div className={styles.taskHeader}>
                                <span className={`${styles.taskTitle}${task.complete ? ` ${styles.taskTitleDone}` : ''}`}>
                                    {task.name}
                                </span>
                                {task.assignedTime && (
                                    <span className={styles.taskTime}>
                                        {dayjs(task.assignedTime, 'HH:mm').format('h:mm A')}
                                    </span>
                                )}
                            </div>
                            <div className={styles.taskMeta}>
                                <span className={`${styles.statusChip} ${statusClass}`}>{statusText}</span>
                                <span className={`${styles.taskDate}${taskOverdue ? ` ${styles.overdue}` : ''}`}>
                                    {dayjs(task.taskDate).format('MMM D')}
                                </span>
                                {task.category && task.category !== 'None' && (
                                    <span className={styles.categoryChip}>
                                        <span className={styles.categoryHash} style={{ color: projectColor(task.category) }}>#</span> {task.category}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
                {filteredTasks.length === 0 && (
                    <li className={styles.noTasks}>
                        <SearchIcon className={styles.noTasksIcon} aria-hidden="true" />
                        <span>{hasCriteria ? 'No tasks found' : 'Type to search your tasks'}</span>
                    </li>
                )}
            </ul>

            {/* Pagination Control */}
            {totalPages > 1 && (
                <div className={styles.paginationContainer}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={handlePageChange}
                        shape="rounded"
                        className={styles.pagination}
                    />
                </div>
            )}
        </div>
    );
}

export default Search;
