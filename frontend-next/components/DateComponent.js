'use client'

import React from 'react';
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';


const DateComponent = ({ selectedDate, handler, darkmode = false }) => {
    const theme = createTheme({
        palette: {
            mode: darkmode ? 'dark' : 'light',
        },
    });
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
