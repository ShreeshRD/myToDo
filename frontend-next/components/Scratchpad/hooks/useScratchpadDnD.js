import { useState } from 'react';

export const useScratchpadDnD = (setBlocks) => {
    const [draggedBlockId, setDraggedBlockId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);

    const handleDragStart = (e, id) => {
        setDraggedBlockId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e, id, position) => {
        if (draggedBlockId && draggedBlockId !== id) {
            setDragOverId(id);
            setDragOverPosition(position);
        }
    };

    const handleDragEnd = () => {
        setDraggedBlockId(null);
        setDragOverId(null);
        setDragOverPosition(null);
    };

    const handleDrop = (e, targetId, position) => {
        if (!draggedBlockId || draggedBlockId === targetId) {
            handleDragEnd();
            return;
        }

        setBlocks(prev => {
            let draggedBlock = null;
            const extractBlock = (list, id) => {
                const result = [];
                for (let b of list) {
                    if (b.id === id) {
                        draggedBlock = { ...b };
                        continue;
                    }
                    if (b.children && b.children.length > 0) {
                        result.push({ ...b, children: extractBlock(b.children, id) });
                    } else {
                        result.push(b);
                    }
                }
                return result;
            };

            let newBlocks = extractBlock(prev, draggedBlockId);
            if (!draggedBlock) return prev;

            const insertAtPosition = (list, targetId, blockToInsert, insertPosition) => {
                const result = [];
                for (let b of list) {
                    if (b.id === targetId && insertPosition === 'before') {
                        result.push(blockToInsert);
                    }
                    if (b.children && b.children.length > 0) {
                        result.push({ ...b, children: insertAtPosition(b.children, targetId, blockToInsert, insertPosition) });
                    } else {
                        result.push(b);
                    }
                    if (b.id === targetId && insertPosition === 'after') {
                        result.push(blockToInsert);
                    }
                }
                return result;
            };

            newBlocks = insertAtPosition(newBlocks, targetId, draggedBlock, position);
            return newBlocks;
        });

        handleDragEnd();
    };

    return {
        draggedBlockId,
        dragOverId,
        dragOverPosition,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDrop
    };
};
