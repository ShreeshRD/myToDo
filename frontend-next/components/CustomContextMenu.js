import React, { useEffect, useRef } from 'react';
import '../styles/CustomContextMenu.css';

const CustomContextMenu = ({ x, y, visible, onClose, onMarkInProgress, onToggleLongTerm, task, onEdit }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('scroll', onClose, true); // Close on scroll
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', onClose, true);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    // Adjust position if menu goes off screen (basic implementation)
    const style = {
        top: y,
        left: x,
    };

    return (
        <div ref={menuRef} className="custom-context-menu" style={style}>
            <div className="menu-item" onClick={onMarkInProgress}>
                {task.inProgress ? 'Unmark In Progress' : 'Mark In Progress'}
            </div>
            <div className="menu-item" onClick={onToggleLongTerm}>
                {task.longTerm ? 'Mark Short Term' : 'Mark Long Term'}
            </div>
            <div className="menu-item" onClick={onEdit}>
                Edit
            </div>
        </div>
    );
};

export default CustomContextMenu;
