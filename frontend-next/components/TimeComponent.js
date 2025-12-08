'use client'

import React from 'react';
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';

const TimeComponent = ({ selectedTime, handler }) => {
    const theme = createTheme({
        palette: {
            mode: 'light',
        },
    });

    return (
        <div style={{ width: '176px' }}>
            <ThemeProvider theme={theme}>
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
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        height: '38px',
                                        borderRadius: '5px',
                                    },
                                },
                                InputLabelProps: {
                                    style: {
                                        color: 'white',
                                    },
                                },
                                sx: {
                                    width: '176px',
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#5a6268',
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
                                        color: 'white',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: 'white',
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
