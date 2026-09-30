'use client';

import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useUI } from '../contexts/UIContext';

// MUI needs parseable colours for its palette (it derives alpha variants),
// so the accent is mirrored here; everything else references CSS variables.
const ACCENT = { light: '#5b5bd6', dark: '#8b8bf5', glass: '#a5a5ff' };

/**
 * Gives MUI widgets (date/time pickers, menus) the app's design tokens.
 * Colours reference the CSS variables in styles/tokens.scss, so MUI follows
 * the light/dark/glass theme without its own palette copy.
 */
export default function MuiThemeBridge({ children }) {
    const { theme } = useUI();
    const muiTheme = useMemo(() => createTheme({
        palette: {
            mode: theme === 'light' ? 'light' : 'dark',
            primary: { main: ACCENT[theme] || ACCENT.light },
        },
        shape: { borderRadius: 10 },
        typography: { fontFamily: 'var(--font-sans)', fontSize: 13, button: { textTransform: 'none' } },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'var(--surface)',
                        backgroundImage: 'none',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        backdropFilter: 'var(--blur)',
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: { borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' },
                    notchedOutline: { borderColor: 'var(--border)' },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: { borderRadius: 'var(--radius-sm)', fontWeight: 500, boxShadow: 'none' },
                    text: { '&:hover': { backgroundColor: 'var(--accent-soft)' } },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'var(--text-2)',
                        '&:hover': { backgroundColor: 'var(--surface-2)' },
                    },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        minHeight: 32,
                        fontSize: 'var(--text-sm)',
                        '&:hover': { backgroundColor: 'var(--surface-2)' },
                        '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent)',
                        },
                    },
                },
            },
            // Date / time pickers
            MuiPickersCalendarHeader: {
                styleOverrides: {
                    label: { fontSize: 'var(--text-md)', fontWeight: 600 },
                },
            },
            MuiDayCalendar: {
                styleOverrides: {
                    weekDayLabel: { color: 'var(--text-3)', fontWeight: 500 },
                },
            },
            MuiPickersDay: {
                styleOverrides: {
                    root: {
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text)',
                        '&:hover': { backgroundColor: 'var(--surface-2)' },
                        '&.MuiPickersDay-today:not(.Mui-selected)': {
                            border: 'none',
                            color: 'var(--accent)',
                            fontWeight: 600,
                        },
                        '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus': {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                            fontWeight: 600,
                        },
                    },
                },
            },
            MuiPickersYear: {
                styleOverrides: {
                    yearButton: {
                        fontSize: 'var(--text-sm)',
                        borderRadius: 'var(--radius-sm)',
                        '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                        },
                    },
                },
            },
            MuiMultiSectionDigitalClockSection: {
                styleOverrides: {
                    root: { '&:not(:first-of-type)': { borderLeftColor: 'var(--border)' } },
                    item: {
                        fontSize: 'var(--text-sm)',
                        borderRadius: 'var(--radius-sm)',
                        '&:hover': { backgroundColor: 'var(--surface-2)' },
                        '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                        },
                    },
                },
            },
            MuiPickersLayout: {
                styleOverrides: {
                    actionBar: { borderTop: '1px solid var(--border)', padding: '6px 8px' },
                },
            },
        },
    }), [theme]);

    return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
