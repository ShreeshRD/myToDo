'use client'

import React from 'react';

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

/**
 * Text-field slot for MUI pickers that renders as a compact chip.
 * Colours are design tokens, so it follows the light/dark/glass theme.
 * `location` = 'header' gives the pill used in the page header; anything else
 * is the borderless variant that sits inside a dialog chip.
 */
export const PickerChipField = React.forwardRef((props, ref) => {
    const {
        inputProps = {}, location, value, onChange, onClick, inputRef, error,
        InputProps, ownerState, chipWidth = '10ch', emptyWidth, emptyLabel, placeholder, className = '',
        // Props MUI passes to text fields that don't belong on a <div>
        theme, label, focused, fullWidth, size, variant, clearable, onClear, sectionListRef,
        areAllSectionsEmpty, enableAccessibleFieldDOMStructure, openPickerAriaLabel, triggerRef,
        ...other
    } = props;

    const isHeader = location === 'header';

    return (
        <div
            className={`custom-date-pill ${isHeader ? 'custom-date-pill--header' : 'custom-date-pill--chip'} ${error ? 'error' : ''} ${className}`}
            ref={ref}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                height: isHeader ? '32px' : '28px',
                padding: isHeader ? '0 4px 0 12px' : '0 0 0 4px',
                borderRadius: isHeader ? 'var(--radius-full)' : 'var(--radius-sm)',
                backgroundColor: isHeader ? 'var(--surface)' : 'transparent',
                border: isHeader ? '1px solid var(--border)' : 'none',
                color: error ? 'var(--danger)' : 'var(--text)',
                width: 'fit-content',
                cursor: 'text',
                transition: 'border-color var(--duration) var(--ease)',
            }}
            onClick={onClick}
            {...other}
        >
            <input
                ref={inputRef}
                {...inputProps}
                placeholder={emptyLabel ?? placeholder ?? inputProps.placeholder}
                aria-label={emptyLabel ?? inputProps['aria-label']}
                value={value || ''}
                onChange={onChange}
                style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'inherit',
                    width: !value && emptyWidth ? emptyWidth : chipWidth,
                    transition: 'width var(--duration) var(--ease)',
                    cursor: 'text',
                    ...inputProps.style,
                }}
            />
            {InputProps?.endAdornment && (
                <div className="custom-date-pill__adornment" style={{ display: 'flex', alignItems: 'center' }}>
                    {InputProps.endAdornment}
                </div>
            )}
        </div>
    );
});
PickerChipField.displayName = 'PickerChipField';

// Small ghost icon button for the picker's open icon
export const pickerOpenButtonSx = {
    width: 24,
    height: 24,
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-3)',
    '&:hover': { backgroundColor: 'var(--surface-3)', color: 'var(--text)' },
    '& .MuiSvgIcon-root': { fontSize: 16, color: 'inherit' },
};

export default function DateComponent({ value, onChange, selectedDate, handler, theme = 'light', location = 'popup' }) {
    const [anchorEl, setAnchorEl] = React.useState(null);

    // Support both prop naming conventions
    const dateValue = value || selectedDate;
    const dateChangeHandler = onChange || handler;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div ref={setAnchorEl} style={{ width: 'fit-content' }} className="date-component">
                <DatePicker
                    value={dateValue}
                    onChange={dateChangeHandler}
                    format="DD/MM/YYYY"
                    enableAccessibleFieldDOMStructure={false}
                    slots={{ textField: PickerChipField }}
                    slotProps={{
                        textField: {
                            theme: theme,
                            location: location
                        },
                        openPickerButton: { sx: pickerOpenButtonSx },
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
    );
}
