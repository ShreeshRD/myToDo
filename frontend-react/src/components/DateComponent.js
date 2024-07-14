import React from 'react';
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

const DateComponent = ({ selectedDate, handler }) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label=""
                defaultValue={dayjs()}
                value={selectedDate}
                onChange={handler}
            />
        </LocalizationProvider>
    );
};

export default DateComponent;