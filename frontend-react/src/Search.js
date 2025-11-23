import React, { useState } from 'react';
import { useTasks } from './contexts/TaskContext';
import { Box, TextField, Typography, Paper, List, ListItem, ListItemText, Chip, Divider } from '@mui/material';
import dayjs from 'dayjs';

function Search() {
    const { taskDays, completedTasks, darkMode } = useTasks();
    const [query, setQuery] = useState('');

    const allTasks = [
        ...Object.values(taskDays).flat(),
        ...Object.values(completedTasks).flat()
    ];

    const filteredTasks = allTasks.filter(task => 
        task.name.toLowerCase().includes(query.toLowerCase())
    );

    const getStatusColor = (task) => {
        if (task.complete) return 'success';
        if (dayjs(task.date).isBefore(dayjs(), 'day')) return 'error';
        return 'primary';
    };

    const getStatusText = (task) => {
        if (task.complete) return 'Completed';
        if (dayjs(task.date).isBefore(dayjs(), 'day')) return 'Overdue';
        return 'Upcoming';
    };

    return (
        <Box sx={{ padding: '20px', height: '100%', overflowY: 'auto', color: darkMode ? '#eee' : 'inherit' }}>
            <Typography variant="h4" gutterBottom>Search Tasks</Typography>
            <TextField
                fullWidth
                label="Search by task name"
                variant="outlined"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ 
                    marginBottom: '20px',
                    input: { color: darkMode ? '#eee' : 'inherit' },
                    label: { color: darkMode ? '#aaa' : 'inherit' },
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' },
                        '&:hover fieldset': { borderColor: darkMode ? '#888' : '#aaa' },
                    }
                }}
            />
            
            <List>
                {query && filteredTasks.map((task, index) => (
                    <React.Fragment key={task.id || index}>
                        <Paper 
                            elevation={1} 
                            sx={{ 
                                marginBottom: '10px', 
                                backgroundColor: darkMode ? '#444' : '#fff',
                                color: darkMode ? '#eee' : 'inherit'
                            }}
                        >
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Typography variant="h6" component="div">
                                            {task.name}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                                            <Chip 
                                                label={getStatusText(task)} 
                                                color={getStatusColor(task)} 
                                                size="small" 
                                                variant={darkMode ? "outlined" : "filled"}
                                            />
                                            <Typography variant="body2" color={darkMode ? '#aaa' : 'textSecondary'}>
                                                {dayjs(task.date).format('MMMM D, YYYY')}
                                            </Typography>
                                            {task.category && task.category !== 'None' && (
                                                <Chip label={task.category} size="small" />
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    </React.Fragment>
                ))}
                {query && filteredTasks.length === 0 && (
                    <Typography variant="body1" color="textSecondary" align="center">
                        No tasks found matching "{query}"
                    </Typography>
                )}
            </List>
        </Box>
    );
}

export default Search;
