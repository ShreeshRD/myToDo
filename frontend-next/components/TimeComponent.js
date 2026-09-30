'use client'

import React from 'react';
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { PickerChipField, pickerOpenButtonSx } from './DateComponent';

// Time chip for the task dialog. Colours come from design tokens via
// MuiThemeBridge and the chip styles in styles/popup.scss.
const TimeComponent = ({ selectedTime, handler }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    return (
        <div ref={setAnchorEl} className={`task-chip time-chip${selectedTime ? ' is-set' : ''}`}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker
                    value={selectedTime}
                    onChange={handler}
                    enableAccessibleFieldDOMStructure={false}
                    slots={{ textField: PickerChipField }}
                    slotProps={{
                        textField: {
                            location: 'popup',
                            emptyLabel: 'Time',
                            chipWidth: '8ch',
                            emptyWidth: '4.5ch',
                        },
                        openPickerButton: { sx: pickerOpenButtonSx },
                        popper: { anchorEl, placement: 'bottom-start' },
                    }}
                />
            </LocalizationProvider>
        </div>
    );
};

export default TimeComponent;
