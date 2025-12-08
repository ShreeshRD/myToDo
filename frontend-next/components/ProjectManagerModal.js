'use client'

import React, { useState, useEffect, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import '../styles/projectManagerModal.scss';

const ProjectManagerModal = ({
    isOpen,
    onClose,
    projects,
    onReorder,
    onDelete,
    darkMode
}) => {
    const [localProjects, setLocalProjects] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteIncomplete, setDeleteIncomplete] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const modalRef = useRef(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalProjects([...projects]);
    }, [projects, isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                if (deleteConfirm) {
                    setDeleteConfirm(null);
                    setDeleteIncomplete(false);
                } else {
                    onClose();
                }
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (deleteConfirm) {
                    setDeleteConfirm(null);
                    setDeleteIncomplete(false);
                } else {
                    onClose();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, deleteConfirm]);

    if (!isOpen) return null;

    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newProjects = [...localProjects];
        const [draggedItem] = newProjects.splice(draggedIndex, 1);
        newProjects.splice(index, 0, draggedItem);
        setLocalProjects(newProjects);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null) {
            onReorder(localProjects);
        }
        setDraggedIndex(null);
    };

    const handleDeleteClick = (projectName) => {
        setDeleteConfirm(projectName);
        setDeleteIncomplete(false);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            onDelete(deleteConfirm, deleteIncomplete);
            setDeleteConfirm(null);
            setDeleteIncomplete(false);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
        setDeleteIncomplete(false);
    };

    return (
        <div className={`pm-overlay${darkMode ? ' dark' : ''}`}>
            <div className="pm-modal" ref={modalRef}>
                <div className="pm-header">
                    <h2>Manage Projects</h2>
                    <button className="pm-close-btn" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>

                <div className="pm-content">
                    {localProjects.length === 0 ? (
                        <div className="pm-empty">No projects yet</div>
                    ) : (
                        <ul className="pm-project-list">
                            {localProjects.map((project, index) => (
                                <li
                                    key={project}
                                    className={`pm-project-item${draggedIndex === index ? ' dragging' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="pm-project-left">
                                        <DragIndicatorIcon className="pm-drag-handle" />
                                        <span className="pm-project-name">{project}</span>
                                    </div>
                                    <button
                                        className="pm-delete-btn"
                                        onClick={() => handleDeleteClick(project)}
                                        title="Delete project"
                                    >
                                        <DeleteIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Delete Confirmation Popup */}
                {deleteConfirm && (
                    <div className="pm-confirm-overlay">
                        <div className="pm-confirm-popup">
                            <div className="pm-confirm-icon">
                                <WarningAmberIcon />
                            </div>
                            <h3>Delete &quot;{deleteConfirm}&quot;?</h3>
                            <p>This project will be removed. Completed tasks will keep their project history.</p>

                            <label className="pm-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={deleteIncomplete}
                                    onChange={(e) => setDeleteIncomplete(e.target.checked)}
                                />
                                <span>Also delete incomplete tasks from this project</span>
                            </label>

                            <div className="pm-confirm-actions">
                                <button className="pm-btn pm-btn-cancel" onClick={cancelDelete}>
                                    Cancel
                                </button>
                                <button className="pm-btn pm-btn-delete" onClick={confirmDelete}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectManagerModal;
