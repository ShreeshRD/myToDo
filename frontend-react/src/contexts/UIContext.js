import React, { createContext, useContext } from 'react';
import useUIState from '../hooks/useUIState';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    const uiState = useUIState();

    return (
        <UIContext.Provider value={uiState}>
            {children}
        </UIContext.Provider>
    );
};
