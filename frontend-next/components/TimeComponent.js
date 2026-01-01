'use client'

import React from 'react';
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';

const TimeComponent = ({ selectedTime, handler, theme = 'light' }) => {
    const muiMode = (theme === 'dark' || theme === 'glass') ? 'dark' : 'light';

    // Theme-specific styling
    const isGlass = theme === 'glass';
    const isDark = theme === 'dark';

    // Glass: translucent white with blur; Dark: solid gray; Light: light gray
    const bgColor = isGlass
        ? 'rgba(255, 255, 255, 0.25)'
        : isDark
            ? '#6c757d'
            : '#f0f0f0';
    const hoverBgColor = isGlass
        ? 'rgba(255, 255, 255, 0.4)'
        : isDark
            ? '#5a6268'
            : '#e0e0e0';
    const textColor = isGlass ? 'black' : (isDark ? 'white' : 'black');
    const borderRadius = isGlass ? '20px' : '5px';

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
                                        borderRadius: borderRadius,
                                        border: isGlass ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                                        backdropFilter: isGlass ? 'blur(4px)' : 'none',
                                        boxShadow: isGlass ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
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
                                        borderRadius: borderRadius,
                                        '&:hover': {
                                            backgroundColor: hoverBgColor,
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
