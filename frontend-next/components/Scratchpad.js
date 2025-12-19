'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/scratchpad.scss';
import { CiMenuKebab } from "react-icons/ci";
import { MdCheckBoxOutlineBlank, MdCheckBox, MdDragIndicator, MdDelete } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

// Utility to set cursor to end of contentEditable
const setCursorToEnd = (element) => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
};

// Recursive Block Component
const Block = ({ block, updateBlock, addBlock, deleteBlock, focusBlock, onKeyDown, theme, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, dragOverId, dragOverPosition }) => {
    const contentRef = useRef(null);

    // Sync content with state manually to preserve cursor position during typing
    useEffect(() => {
        // Normalize non-breaking spaces for comparison (browser uses \u00A0 for spaces in contentEditable)
        const normalizedInnerText = contentRef.current?.innerText?.replace(/\u00A0/g, ' ') || '';
        if (contentRef.current && normalizedInnerText !== block.content) {
            // Only update if they differ (e.g. external change or slash command clear)
            contentRef.current.innerText = block.content;

            // If changing type/content via slash command (length mismatch effectively), 
            // we might want to move cursor to end?
            // E.g. /1 -> (empty). 
            if (block.isFocused) {
                // native implementation of "move to end" if needed, 
                // but typically browser handles typing. 
                // We mainly need to fix the "command stays" case.
                if (block.content === '' && contentRef.current.innerText === '') {
                    // cleared
                } else {
                    setCursorToEnd(contentRef.current);
                }
            }
        }
    }, [block.content, block.type]); // Sync when content OR type changes

    // Auto-focus if this block is meant to be focused
    useEffect(() => {
        if (block.isFocused && contentRef.current) {
            contentRef.current.focus();
        }
    }, [block.isFocused]);

    const handleInput = (e) => {
        const text = e.currentTarget.innerText.replace(/\u00A0/g, ' ');
        // Avoid update if text is same to prevent cursor jumping (though manual check handles this too)
        if (text !== block.content) {
            updateBlock(block.id, { content: text });
        }
    };

    const handleLocalKeyDown = (e) => {
        onKeyDown(e, block);
    };

    const handleDragStart = (e) => {
        e.stopPropagation();
        onDragStart(e, block.id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Determine if we're in the top or bottom half of the block
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'before' : 'after';
        onDragOver(e, block.id, position);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'before' : 'after';
        onDrop(e, block.id, position);
    };

    const handleDragEnd = (e) => {
        onDragEnd(e);
    };

    const isDragOverBefore = dragOverId === block.id && dragOverPosition === 'before';
    const isDragOverAfter = dragOverId === block.id && dragOverPosition === 'after';

    return (
        <div
            className={`block-wrapper ${block.type} ${theme} ${isDragging ? 'dragging' : ''} ${isDragOverBefore ? 'drag-over-before' : ''} ${isDragOverAfter ? 'drag-over-after' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="block-content-row">
                {/* Block controls that appear on hover - delete and drag handle */}
                <div className="block-controls">
                    <span
                        className="delete-icon"
                        onClick={() => deleteBlock(block.id)}
                        title="Delete block"
                    >
                        <MdDelete />
                    </span>
                    <span
                        className="drag-handle"
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        title="Drag to reorder"
                    >
                        <MdDragIndicator />
                    </span>
                </div>

                {block.type === 'toggle' && (
                    <span
                        className="toggle-icon"
                        contentEditable={false}
                        onClick={() => updateBlock(block.id, { isOpen: !block.isOpen })}
                    >
                        {block.isOpen ? <IoIosArrowDown /> : <IoIosArrowForward />}
                    </span>
                )}

                {block.type === 'todo' && (
                    <span
                        className="todo-icon"
                        contentEditable={false}
                        onClick={() => updateBlock(block.id, { checked: !block.checked })}
                    >
                        {block.checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                    </span>
                )}

                <div
                    ref={contentRef}
                    id={`block-${block.id}`}
                    className={`block-content ${block.type} ${block.checked ? 'checked' : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleLocalKeyDown}
                    placeholder={block.type === 'p' ? "Type '/' for commands" : "List item..."}
                    data-placeholder={block.type === 'p' && !block.content ? "Type '/' for commands" : ""}
                />
            </div>

            {/* Recursive Children for Toggles */}
            {block.type === 'toggle' && block.isOpen && block.children && block.children.length > 0 && (
                <div className="block-children">
                    {block.children.map(child => (
                        <Block
                            key={child.id}
                            block={child}
                            updateBlock={updateBlock}
                            addBlock={addBlock}
                            deleteBlock={deleteBlock}
                            focusBlock={focusBlock}
                            onKeyDown={onKeyDown}
                            theme={theme}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDragEnd={onDragEnd}
                            onDrop={onDrop}
                            isDragging={isDragging}
                            dragOverId={dragOverId}
                            dragOverPosition={dragOverPosition}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

function Scratchpad({ theme }) {
    // Flattened list might be easier for non-toggle dragging, but tree is better for toggles.
    // Let's use a flat list for now and simulate hierarchy with indentation? 
    // No, user agreed to recursive.
    const [blocks, setBlocks] = useState([
        { id: '1', type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }
    ]);

    // Slash Menu State
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [activeBlockId, setActiveBlockId] = useState(null);

    // Drag and Drop State
    const [draggedBlockId, setDraggedBlockId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);

    // Helpers to find and update nested blocks
    const findBlock = (id, list) => {
        for (let b of list) {
            if (b.id === id) return b;
            if (b.children.length > 0) {
                const found = findBlock(id, b.children);
                if (found) return found;
            }
        }
        return null;
    };

    // Generic update function for recursive state
    const modifyBlocks = (id, callback, list) => {
        return list.map(block => {
            if (block.id === id) {
                return callback(block);
            }
            if (block.children && block.children.length > 0) {
                return { ...block, children: modifyBlocks(id, callback, block.children) };
            }
            return block;
        });
    };

    // Delete a block by ID (recursively)
    const deleteBlock = (id) => {
        const removeBlock = (list) => {
            const result = [];
            for (let b of list) {
                if (b.id === id) {
                    // Skip this block (delete it)
                    continue;
                }
                if (b.children && b.children.length > 0) {
                    result.push({ ...b, children: removeBlock(b.children) });
                } else {
                    result.push(b);
                }
            }
            return result;
        };

        setBlocks(prev => {
            const newBlocks = removeBlock(prev);
            // If all blocks are deleted, add an empty one
            if (newBlocks.length === 0) {
                return [{ id: Date.now().toString(), type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }];
            }
            return newBlocks;
        });
    };

    // Focus a specific block
    const focusBlock = (id) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({ ...b, isFocused: true }), prev));
    };

    // Drag and Drop handlers
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
            // Helper to extract a block from the tree
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

            // Remove the dragged block from its original position
            let newBlocks = extractBlock(prev, draggedBlockId);

            if (!draggedBlock) {
                return prev;
            }

            // Insert the dragged block before or after the target based on position
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

    const updateBlock = (id, updates) => {
        // Special check for slash commands in content
        if (updates.content !== undefined) {
            const text = updates.content;
            const commandTriggered = handleSlashCommandInput(text, id);
            // If a command was triggered, don't update the content (it's already been cleared)
            if (commandTriggered) {
                return;
            }
        }
        setBlocks(prev => modifyBlocks(id, (b) => ({ ...b, ...updates }), prev));
    };

    const handleSlashCommandInput = (text, id) => {
        // Check for exact matches first for shortcuts
        // Returns true if a command was triggered, false otherwise
        if (text === '/1') {
            convertToType(id, 'h1');
            return true;
        }
        if (text === '/2') {
            convertToType(id, 'h2');
            return true;
        }
        if (text === '/3') {
            convertToType(id, 'h3');
            return true;
        }
        if (text === '/toggle') {
            convertToType(id, 'toggle');
            return true;
        }
        // Checklist pattern "[]" (without space to avoid breaking normal typing)
        if (text === '[]') {
            convertToType(id, 'todo');
            return true;
        }

        // Show menu if ends with /
        if (text.endsWith('/')) {
            const blockEl = document.getElementById(`block-${id}`); // We need to assign IDs to wrapper or find focused
            // Actually, we can just position it near cursor or center for now.
            // Let's use a simple approach: if '/' is typed, open menu.
        }
        return false;
    };

    const convertToType = (id, type, newContent = null) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({
            ...b,
            type,
            content: newContent !== null ? newContent : '', // Clear content for slash commands? Or keep? Usually clear the command.
            // If it was a shortcut like /1, we clear it.
        }), prev));
        // Also probably want to focus it again
    };

    const addBlock = (afterId) => {
        const newBlock = { id: Date.now().toString(), type: 'p', content: '', children: [], isFocused: true };

        setBlocks(prev => {
            const deepInsert = (list) => {
                let res = [];
                for (let i = 0; i < list.length; i++) {
                    const b = list[i];
                    // Unfocus all blocks except the new one
                    res.push({ ...b, isFocused: false });
                    if (b.id === afterId) {
                        if (b.type === 'toggle' && b.isOpen) {
                            // Insert into children of the toggle block
                            res[res.length - 1].children = [newBlock, ...b.children];
                        } else {
                            // Insert as a sibling after the current block
                            res.push(newBlock);
                        }
                    } else if (b.children.length > 0) {
                        // Recursively search in children
                        res[res.length - 1].children = deepInsert(b.children);
                    }
                }
                return res;
            };
            return deepInsert(prev);
        });
    };

    const handleKeyDown = (e, block) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBlock(block.id);
        }
        if (e.key === 'Backspace' && block.content === '') {
            // Delete block
            e.preventDefault();
            deleteBlock(block.id);
        }
    };

    return (
        <div className={`scratchpad-container ${theme}`} onClick={() => {
            // If empty, focus last? 
        }}>
            <h1 className="scratchpad-title">Scratchpad</h1>
            <div className="scratchpad-editor">
                {blocks.map(block => (
                    <Block
                        key={block.id}
                        block={block}
                        updateBlock={updateBlock}
                        addBlock={addBlock}
                        deleteBlock={deleteBlock}
                        focusBlock={focusBlock}
                        onKeyDown={handleKeyDown}
                        theme={theme}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        isDragging={draggedBlockId === block.id}
                        dragOverId={dragOverId}
                        dragOverPosition={dragOverPosition}
                    />
                ))}
            </div>
            {/* Slash Menu Popup would go here */}
        </div>
    );
}

export default Scratchpad;

