'use client'

import React, { useState, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { Box, TextField, Typography, Paper, List, ListItem, ListItemText, Chip, InputAdornment, Pagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import dayjs from 'dayjs';
import styles from './Search.module.css';

function Search() {
    const { taskDays, completedTasks, overdueTasks, darkMode, callPopup } = useTasks();
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

    const getStatusColor = (task) => {
        if (task.complete) return '#4caf50'; // Green
        if (dayjs(task.taskDate).isBefore(dayjs(), 'day')) return '#f44336'; // Red
        return '#2196f3'; // Blue
    };

    const getStatusText = (task) => {
        if (task.complete) return 'Completed';
        if (dayjs(task.taskDate).isBefore(dayjs(), 'day')) return 'Overdue';
        return 'Active';
    };

    const filters = ['All', 'Completed', 'Active', 'Recurring', 'Project'];

    const getFilterColor = (filter) => {
        if (activeFilter !== filter) return darkMode ? '#222' : '#f0f0f0';
        switch (filter) {
            case 'Completed': return '#4caf50';
            case 'Active': return '#2196f3';
            default: return '#2196f3'; // Default active color
        }
    };

    const isOverdue = (task) => !task.complete && dayjs(task.taskDate).isBefore(dayjs(), 'day');

    const handleTaskClick = (task) => {
        callPopup(task.taskDate, task);
    };

    const themeClass = darkMode ? 'dark' : 'light';

    return (
        <div className={`${styles.searchContainer} ${darkMode ? styles.dark : ''}`}>
            {/* Search Bar */}
            <TextField
                fullWidth
                placeholder="Search tasks, projects, or dates..."
                variant="outlined"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchBar}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#888' }} />
                        </InputAdornment>
                    ),
                    className: `${styles.searchBarInput} ${styles[themeClass]}`
                }}
                sx={{ 
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': { border: 'none' }
                    }
                }}
            />

            {/* Filter Chips */}
            <div className={styles.filterContainer}>
                {filters.map(filter => {
                    const isActive = activeFilter === filter;
                    const chipClass = isActive 
                        ? `${styles.filterChip} ${styles.active} ${filter === 'Completed' ? styles.activeCompleted : styles.activeOther}`
                        : `${styles.filterChip} ${styles.inactive} ${styles[themeClass]}`;
                    
                    return (
                        <Chip
                            key={filter}
                            label={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={chipClass}
                            sx={{
                                backgroundColor: getFilterColor(filter),
                                '&:hover': {
                                    backgroundColor: isActive ? getFilterColor(filter) : (darkMode ? '#555' : '#ddd')
                                }
                            }}
                        />
                    );
                })}
            </div>
            
            <List className={`${styles.taskList} ${styles[themeClass]}`}>
                {paginatedTasks.map((task, index) => {
                    const taskOverdue = isOverdue(task);
                    const statusText = getStatusText(task);
                    
                    return (
                        <React.Fragment key={task.id || index}>
                            <Paper 
                                elevation={0} 
                                onClick={() => handleTaskClick(task)}
                                className={`${styles.taskPaper} ${styles[themeClass]}`}
                            >
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <div className={styles.taskHeader}>
                                                <Typography 
                                                    variant="h6" 
                                                    component="div" 
                                                    className={styles.taskTitle}
                                                >
                                                    {task.name}
                                                </Typography>
                                                {task.assignedTime && (
                                                    <Typography 
                                                        variant="body2" 
                                                        className={`${styles.taskTime} ${styles[themeClass]}`}
                                                    >
                                                        {dayjs(task.assignedTime, 'HH:mm').format('h:mm A')}
                                                    </Typography>
                                                )}
                                            </div>
                                        }
                                        secondary={
                                            <div className={styles.taskMeta}>
                                                <Chip 
                                                    label={statusText} 
                                                    size="small" 
                                                    className={`${styles.statusChip} ${
                                                        task.complete ? styles.completed : 
                                                        taskOverdue ? styles.overdue : 
                                                        styles.active
                                                    }`}
                                                    sx={{ backgroundColor: getStatusColor(task) }}
                                                />
                                                <Typography 
                                                    variant="body2" 
                                                    className={`${styles.taskDate} ${
                                                        taskOverdue ? styles.overdue : styles[themeClass]
                                                    }`}
                                                >
                                                    {dayjs(task.taskDate).format('MMM D')}
                                                </Typography>
                                                {task.category && task.category !== 'None' && (
                                                    <Chip 
                                                        label={task.category} 
                                                        size="small" 
                                                        className={`${styles.categoryChip} ${styles[themeClass]}`}
                                                    /> 
                                                )}
                                            </div>
                                        }
                                        secondaryTypographyProps={{ component: 'div' }}
                                    />
                                </ListItem>
                            </Paper>
                        </React.Fragment>
                    );
                })}
                {filteredTasks.length === 0 && (
                    <Typography variant="body1" color="textSecondary" className={styles.noTasks}>
                        No tasks found
                    </Typography>
                )}
            </List>

            {/* Pagination Control */}
            {totalPages > 1 && (
                <div className={styles.paginationContainer}>
                    <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={handlePageChange} 
                        color="primary"
                        sx={{
                            '& .MuiPaginationItem-root': {
                                color: darkMode ? '#eee' : 'inherit',
                            },
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default Search;
