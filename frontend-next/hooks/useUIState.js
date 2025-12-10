import { useState, useEffect } from 'react';

const useUIState = () => {
    // Initialize state lazily to avoid hydration mismatch if possible, 
    // but for localStorage we need to handle it carefully in Next.js (SSR).
    // We'll start with defaults and update in useEffect.
    const [showSidebar, setShowSidebar] = useState(true);
    const [theme, setTheme] = useState('light'); // 'light', 'dark', 'glass'
    const [viewPage, setViewPage] = useState('Upcoming');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const savedShowSidebar = localStorage.getItem('showSidebar');
        if (savedShowSidebar) setShowSidebar(JSON.parse(savedShowSidebar));

        // Migration: Check for old boolean 'darkMode' first
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme) {
            setTheme(JSON.parse(savedTheme));
        } else if (savedDarkMode) {
            // Migrate old boolean to new string
            const isDark = JSON.parse(savedDarkMode);
            setTheme(isDark ? 'dark' : 'light');
        }

        const savedViewPage = localStorage.getItem('viewPage');
        if (savedViewPage) setViewPage(JSON.parse(savedViewPage));
    }, []);

    useEffect(() => {
        if (mounted) localStorage.setItem('showSidebar', JSON.stringify(showSidebar));
    }, [showSidebar, mounted]);

    useEffect(() => {
        if (mounted) localStorage.setItem('theme', JSON.stringify(theme));
    }, [theme, mounted]);

    useEffect(() => {
        if (mounted) localStorage.setItem('viewPage', JSON.stringify(viewPage));
    }, [viewPage, mounted]);

    // Prevent hydration mismatch by rendering nothing or defaults until mounted
    // Or just return state, but be aware of flash. 
    // For this app, we'll just return state.

    return {
        showSidebar,
        setShowSidebar,
        showSidebar,
        setShowSidebar,
        theme,
        setTheme,
        viewPage,
        setViewPage,
        mounted // Expose mounted state if needed
    };
};

export default useUIState;
