'use client'

import React, { useState, useEffect, useRef } from 'react';

const Dropdown = ({ placeholder, items, handler }) => {
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
                className="btn btn-secondary dropdown-toggle" 
                type="button" 
                onClick={toggleDropdown}
            >
                {placeholder}
            </button>
            {isOpen && (
                <ul className="dropdown-menu show">
                    {items.map((item, index) => (
                        <li key={index} onClick={handleItemClick} className="dropdown-item">
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Dropdown;
