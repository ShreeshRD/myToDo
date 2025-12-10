'use client'

import React, { useState, useEffect } from 'react';
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';


const DateComponent = ({ selectedDate, handler, theme = 'light' }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const muiMode = (theme === 'dark' || theme === 'glass') ? 'dark' : 'light';

    const muiTheme = createTheme({
        palette: {
            mode: muiMode,
        },
    });

    if (!mounted) {
        return null;
    }

    return (
        <ThemeProvider theme={muiTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label=""
                    value={selectedDate}
                    onChange={handler}
                />
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default DateComponent;
