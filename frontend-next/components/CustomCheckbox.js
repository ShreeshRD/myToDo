'use client'

import React from 'react';
import '../styles/mycheckbox.scss';

const CustomCheckbox = ({ checked, onChange, onContextMenu, icon, checkedIcon, letter = '' }) => {

    return (
        <div className="checkmark" onClick={onChange} onContextMenu={onContextMenu} data-testid={`checkbox-${letter}`}>
            {checked ? checkedIcon : icon}
            {letter && <span className={`checkmark-letter${checked ? ' checked' : ''}`}>{letter}</span>}
        </div>
    );
};

export default CustomCheckbox;
