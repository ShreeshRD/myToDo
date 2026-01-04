import { useState, useCallback } from 'react';
import { MENU_ITEMS } from '../SlashMenu';

export const useScratchpadSlashMenu = (convertToType) => {
    const [slashMenu, setSlashMenu] = useState({
        isOpen: false,
        position: null,
        blockId: null,
        selectedIndex: 0,
        query: ''
    });

    const openSlashMenu = useCallback((blockId, position) => {
        setSlashMenu({
            isOpen: true,
            position,
            blockId,
            selectedIndex: 0,
            query: ''
        });
    }, []);

    const closeSlashMenu = useCallback(() => {
        setSlashMenu(prev => ({ ...prev, isOpen: false, position: null, blockId: null, query: '' }));
    }, []);

    const setSlashQuery = useCallback((query) => {
        setSlashMenu(prev => ({ ...prev, query, selectedIndex: 0 }));
    }, []);

    const handleSlashMenuSelect = useCallback((type) => {
        if (slashMenu.blockId) {
            convertToType(slashMenu.blockId, type, '');
            closeSlashMenu();
        }
    }, [slashMenu.blockId, convertToType, closeSlashMenu]);


    const navigateSlashMenu = useCallback((direction, filteredItemsCount) => {
        setSlashMenu(prev => {
            if (!prev.isOpen) return prev;
            let newIndex = prev.selectedIndex + direction;
            if (newIndex < 0) newIndex = filteredItemsCount - 1;
            if (newIndex >= filteredItemsCount) newIndex = 0;
            return { ...prev, selectedIndex: newIndex };
        });
    }, []);

    return {
        slashMenu,
        openSlashMenu,
        closeSlashMenu,
        handleSlashMenuSelect,
        navigateSlashMenu,
        setSlashQuery,
        setSlashMenu
    };
};
