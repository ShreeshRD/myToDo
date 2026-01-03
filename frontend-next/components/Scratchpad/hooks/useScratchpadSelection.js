import { useState, useEffect } from 'react';

export const useScratchpadSelection = (ignoreClickRef, isDragInteractionRef) => {
    const [selectedBlockIds, setSelectedBlockIds] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);

    const handleMouseDown = (e) => {
        // Ignore if clicking on interactive elements
        if (e.target.closest('.block-content') ||
            e.target.closest('.block-controls') ||
            e.target.closest('.toggle-icon') ||
            e.target.closest('.todo-icon')) {

            if (!e.shiftKey) {
                setSelectedBlockIds([]);
            }
            return;
        }

        setIsSelecting(true);
        setSelectionStart({ x: e.clientX, y: e.clientY });
        setSelectionBox({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
        isDragInteractionRef.current = false;

        if (!e.shiftKey) {
            setSelectedBlockIds([]);
        }
    };

    useEffect(() => {
        if (!isSelecting) return;

        const handleMouseMove = (e) => {
            isDragInteractionRef.current = true;
            const currentX = e.clientX;
            const currentY = e.clientY;

            const box = {
                left: Math.min(selectionStart.x, currentX),
                top: Math.min(selectionStart.y, currentY),
                width: Math.abs(currentX - selectionStart.x),
                height: Math.abs(currentY - selectionStart.y)
            };
            setSelectionBox(box);

            const selected = [];
            const blockWrappers = document.querySelectorAll('.block-wrapper');
            blockWrappers.forEach(wrapper => {
                const rect = wrapper.getBoundingClientRect();
                if (rect.left < box.left + box.width &&
                    rect.left + rect.width > box.left &&
                    rect.top < box.top + box.height &&
                    rect.top + rect.height > box.top) {
                    const id = wrapper.getAttribute('data-block-id');
                    if (id) selected.push(id);
                }
            });
            setSelectedBlockIds(selected);
        };

        const handleMouseUp = () => {
            if (isDragInteractionRef.current) {
                ignoreClickRef.current = true;
            }
            setIsSelecting(false);
            setSelectionBox(null);
            isDragInteractionRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isSelecting, selectionStart, isDragInteractionRef, ignoreClickRef]);

    return {
        selectedBlockIds,
        setSelectedBlockIds,
        isSelecting,
        selectionStart,
        selectionBox,
        handleMouseDown
    };
};
