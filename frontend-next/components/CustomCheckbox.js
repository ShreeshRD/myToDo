'use client'

import React from 'react';
import '../styles/mycheckbox.scss';

/**
 * Round task checkbox. Pass `priority` (0–4) for the design-system ring whose colour
 * follows the task priority; without it the legacy `icon` / `checkedIcon` are rendered
 * (used by the weekday picker with `letter`).
 */
const CustomCheckbox = ({ checked, onChange, icon, checkedIcon, letter = '', priority }) => {
    if (priority !== undefined && priority !== null && !letter) {
        return (
            <div
                className={`checkmark checkmark--ring p${priority}${checked ? ' checked' : ''}`}
                onClick={onChange}
                role="checkbox"
                aria-checked={!!checked}
            >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4.5 8.2l2.3 2.3 4.7-4.9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }

    return (
        <div className="checkmark" onClick={onChange} data-testid={`checkbox-${letter}`}>
            {checked ? checkedIcon : icon}
            {letter && <span className={`checkmark-letter${checked ? ' checked' : ''}`}>{letter}</span>}
        </div>
    );
};

export default CustomCheckbox;
