'use client'

import React from 'react';
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';

const TimeComponent = ({ selectedTime, handler, theme = 'light' }) => {
    const muiMode = (theme === 'dark' || theme === 'glass') ? 'dark' : 'light';

    // For glass/dark themes, use lighter text/border logic
    const isDarkOrGlass = theme === 'dark' || theme === 'glass';
    const bgColor = isDarkOrGlass ? '#6c757d' : '#f0f0f0'; // Example adaptation
    const textColor = isDarkOrGlass ? 'white' : 'black';

    const muiTheme = createTheme({
        palette: {
            mode: muiMode, // 'dark' or 'light'
        },
    });

    return (
        <div style={{ width: '176px' }}>
            <ThemeProvider theme={muiTheme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                        label="Time"
                        value={selectedTime}
                        onChange={handler}
                        slotProps={{
                            textField: {
                                size: 'small',
                                InputProps: {
                                    style: {
                                        backgroundColor: bgColor,
                                        color: textColor,
                                        height: '38px',
                                        borderRadius: '5px',
                                    },
                                },
                                InputLabelProps: {
                                    style: {
                                        color: textColor,
                                    },
                                },
                                sx: {
                                    width: '176px',
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: bgColor,
                                        color: textColor,
                                        '&:hover': {
                                            backgroundColor: isDarkOrGlass ? '#5a6268' : '#e0e0e0',
                                        },
                                        '& fieldset': {
                                            border: 'none',
                                        },
                                        '&:hover fieldset': {
                                            border: 'none',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: 'none',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: textColor,
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: textColor,
                                    },
                                }
                            }
                        }}
                    />
                </LocalizationProvider>
            </ThemeProvider>
        </div>
    );
};

export default TimeComponent;
