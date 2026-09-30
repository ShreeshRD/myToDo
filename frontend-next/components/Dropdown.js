'use client'

import React, { useState, useEffect, useRef } from 'react';

/**
 * Chip-style trigger with a small menu. `handler` receives the click event;
 * callers read the chosen value from `event.target.textContent`, so items render
 * as plain text only (decorations are CSS pseudo-elements keyed on data-value).
 */
const Dropdown = ({ placeholder, items, handler, selected, isSet = false, ariaLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleItemClick = (e) => {
        handler(e);
        setIsOpen(false);
    };

    return (
        <div className="dropdown" ref={dropdownRef}>
            <button
                className={`btn btn-secondary dropdown-toggle${isSet ? ' is-set' : ''}`}
                type="button"
                onClick={toggleDropdown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel}
                title={ariaLabel}
            >
                {placeholder}
            </button>
            {isOpen && (
                <ul className="dropdown-menu show" role="listbox">
                    {items.map((item, index) => (
                        <li
                            key={index}
                            onClick={handleItemClick}
                            className={`dropdown-item${selected === item ? ' selected' : ''}`}
                            data-value={item}
                            role="option"
                            aria-selected={selected === item}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Dropdown;
