'use client'

import React from 'react';
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from '@mui/material';


const CustomDateInput = React.forwardRef((props, ref) => {
    const { inputProps = {}, theme, location, value, onChange, onClick, inputRef, ...other } = props;

    // inputProps.onClick handles simple clicks (like opening text caret)
    // onClick (from props) handles the DatePicker opening if openPickerOnInputClick is true?
    // Actually MUI DatePicker usually requires onClick on the input or container to open.
    // Let's combine clicks if needed, but usually InputProps.endAdornment (icon) opens it too.

    return (
        <div
            className={`custom-date-pill ${theme === 'glass' ? 'glass-pill' : ''} ${props.error ? 'error' : ''}`}
            ref={ref}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '20px',
                backgroundColor: theme === 'glass'
                    ? 'rgba(255, 255, 255, 0.25)'
                    : (theme === 'dark'
                        ? (location === 'header' ? '#5a5a5a' : '#d5d5d5')
                        : '#f5f5f5'),
                border: theme === 'glass' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #ddd',
                backdropFilter: theme === 'glass' ? 'blur(4px)' : 'none',
                width: 'fit-content',
                transition: 'all 0.2s ease',
                cursor: 'text',
                boxShadow: theme === 'glass' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
            }}
            // Pass the onClick from props to the div to serve as anchor trigger if needed,
            // or just ensure input gets it.
            // MUI DatePicker passes onClick that toggles the modal.
            onClick={onClick}
            {...other}
        >
            <input
                ref={inputRef}
                {...inputProps}
                value={value || ''}
                onChange={onChange}
                style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '14px',
                    color: (theme === 'glass' && location === 'header') ? 'white' : (theme === 'dark' && location === 'header' ? '#eee' : '#333'),
                    width: '80px',
                    cursor: 'text',
                    ...inputProps.style,
                }}
            />
            {props.InputProps?.endAdornment && (
                <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                    {props.InputProps.endAdornment}
                </div>
            )}
        </div>
    );
});
CustomDateInput.displayName = 'CustomDateInput';

export default function DateComponent({ value, onChange, selectedDate, handler, theme = 'light', location = 'popup' }) {
    const [anchorEl, setAnchorEl] = React.useState(null);

    // Support both prop naming conventions
    const dateValue = value || selectedDate;
    const dateChangeHandler = onChange || handler;

    // Minimal MUI theme just for the popup calendar
    const muiTheme = createTheme({
        palette: {
            mode: theme === 'dark' ? 'dark' : 'light',
        },
        components: {
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: (theme === 'glass' && location === 'header') ? 'white' : (theme === 'dark' && location === 'header' ? '#eee' : '#333'),
                    }
                }
            },
            MuiSvgIcon: {
                styleOverrides: {
                    root: {
                        color: (theme === 'glass' && location === 'header') ? 'white' : (theme === 'dark' && location === 'header' ? '#eee' : '#333'),
                    }
                }
            },
            MuiPaper: {
                styleOverrides: {
                    root: theme === 'glass' ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        color: 'black'
                    } : {}
                }
            },
            MuiPickersDay: {
                styleOverrides: {
                    root: theme === 'glass' ? {
                        color: 'black',
                        '&.Mui-selected': { backgroundColor: 'black', color: 'white' }
                    } : {}
                }
            }
        }
    });

    return (
        <ThemeProvider theme={muiTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div ref={setAnchorEl} style={{ width: 'fit-content' }} className="date-component">
                    <DatePicker
                        value={dateValue}
                        onChange={dateChangeHandler}
                        format="DD/MM/YYYY"
                        enableAccessibleFieldDOMStructure={false}
                        slots={{ textField: CustomDateInput }}
                        slotProps={{
                            textField: {
                                theme: theme,
                                location: location
                            },
                            popper: {
                                anchorEl: anchorEl,
                                placement: 'bottom-start',
                                modifiers: [
                                    {
                                        name: 'offset',
                                        options: {
                                            offset: [0, 8],
                                        },
                                    },
                                    {
                                        name: 'preventOverflow',
                                        options: {
                                            boundary: 'viewport',
                                            altAxis: true,
                                        },
                                    },
                                ],
                            }
                        }}
                        disableOpenPicker={false}
                    />
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
