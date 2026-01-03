import { useState, useCallback } from 'react';
import { MENU_ITEMS } from '../SlashMenu';

export const useScratchpadSlashMenu = (convertToType) => {
    const [slashMenu, setSlashMenu] = useState({
        isOpen: false,
        position: null,
        blockId: null,
        selectedIndex: 0
    });

    const openSlashMenu = useCallback((blockId, position) => {
        setSlashMenu({
            isOpen: true,
            position,
            blockId,
            selectedIndex: 0
        });
    }, []);

    const closeSlashMenu = useCallback(() => {
        setSlashMenu(prev => ({ ...prev, isOpen: false, position: null, blockId: null }));
    }, []);

    const handleSlashMenuSelect = useCallback((type) => {
        if (slashMenu.blockId) {
            convertToType(slashMenu.blockId, type, '');
            closeSlashMenu();
        }
    }, [slashMenu.blockId, convertToType, closeSlashMenu]);


    const navigateSlashMenu = useCallback((direction) => {
        setSlashMenu(prev => {
            if (!prev.isOpen) return prev;
            let newIndex = prev.selectedIndex + direction;
            if (newIndex < 0) newIndex = MENU_ITEMS.length - 1;
            if (newIndex >= MENU_ITEMS.length) newIndex = 0;
            return { ...prev, selectedIndex: newIndex };
        });
    }, []);

    return {
        slashMenu,
        openSlashMenu,
        closeSlashMenu,
        handleSlashMenuSelect,
        navigateSlashMenu,
        setSlashMenu
    };
};
