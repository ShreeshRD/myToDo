'use client'

import React, { useState, useEffect } from 'react';
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';


const DateComponent = ({ selectedDate, handler, darkmode = false }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = createTheme({
        palette: {
            mode: darkmode ? 'dark' : 'light',
        },
    });

    if (!mounted) {
        return null;
    }

    return (
        <ThemeProvider theme={theme}>
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
