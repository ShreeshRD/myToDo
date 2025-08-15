import { useState, useEffect } from 'react';

const useUIState = () => {
    const [showSidebar, setShowSidebar] = useState(() => {
        const savedShowSidebar = localStorage.getItem('showSidebar');
        return savedShowSidebar ? JSON.parse(savedShowSidebar) : true;
    });
    const [darkMode, setDarkMode] = useState(() => {
        const savedDarkMode = localStorage.getItem('darkMode');
        return savedDarkMode ? JSON.parse(savedDarkMode) : false;
    });
    const [viewPage, setViewPage] = useState(() => {
        const savedViewPage = localStorage.getItem('viewPage');
        return savedViewPage ? JSON.parse(savedViewPage) : 'Upcoming';
    });

    useEffect(() => {
        localStorage.setItem('showSidebar', JSON.stringify(showSidebar));
    }, [showSidebar]);

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('viewPage', JSON.stringify(viewPage));
    }, [viewPage]);

    return {
        showSidebar,
        setShowSidebar,
        darkMode,
        setDarkMode,
        viewPage,
        setViewPage,
    };
};

export default useUIState;
