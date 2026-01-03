'use client';

import React, { useState, useRef, useEffect } from 'react';
import '../styles/scratchpad.scss';
import { MdCheckBoxOutlineBlank, MdCheckBox, MdDragIndicator, MdDelete } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { getScratchpad, saveScratchpad } from '../service';

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
const Block = ({ block, updateBlock, addBlock, deleteBlock, focusBlock, onKeyDown, theme, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, dragOverId, dragOverPosition, selectedBlockIds }) => {
    const contentRef = useRef(null);

    // Sync content with state manually to preserve cursor position during typing
    useEffect(() => {
        // Normalize non-breaking spaces for comparison (browser uses \u00A0 for spaces in contentEditable)
        const normalizedInnerText = contentRef.current?.innerText?.replace(/\u00A0/g, ' ') || '';
        if (contentRef.current && normalizedInnerText !== block.content) {
            // Only update if they differ (e.g. external change or slash command clear)
            contentRef.current.innerText = block.content;

            if (block.isFocused) {
                if (block.content === '' && contentRef.current.innerText === '') {
                    // cleared
                } else {
                    setCursorToEnd(contentRef.current);
                }
            }
        }
    }, [block.content, block.type, block.isFocused]); // Sync when content OR type changes

    // Auto-focus if this block is meant to be focused
    useEffect(() => {
        if (block.isFocused && contentRef.current) {
            contentRef.current.focus();
            if (block.cursorAtEnd) {
                setCursorToEnd(contentRef.current);
            }
        }
    }, [block.isFocused, block.focusTrigger, block.cursorAtEnd]);

    const handleInput = (e) => {
        const text = e.currentTarget.innerText.replace(/\u00A0/g, ' ');
        // Avoid update if text is same to prevent cursor jumping
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
    const isSelected = selectedBlockIds.includes(block.id);

    return (
        <div
            className={`block-wrapper ${block.type} ${theme} ${isDragging ? 'dragging' : ''} ${isDragOverBefore ? 'drag-over-before' : ''} ${isDragOverAfter ? 'drag-over-after' : ''} ${isSelected ? 'selected' : ''}`}
            data-block-id={block.id}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="block-content-row">
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
                            selectedBlockIds={selectedBlockIds}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

function Scratchpad({ theme }) {
    const [blocks, setBlocks] = useState([
        { id: '1', type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }
    ]);
    const [loaded, setLoaded] = useState(false);

    // Selection State
    const [selectedBlockIds, setSelectedBlockIds] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);

    // Core Load Data Effect
    useEffect(() => {
        getScratchpad().then(data => {
            if (data && data.content) {
                try {
                    const parsed = JSON.parse(data.content);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setBlocks(parsed);
                    }
                } catch (e) {
                    console.error("Failed to parse scratchpad content:", e);
                }
            }
            setLoaded(true);
        }).catch(err => {
            console.error("Failed to load scratchpad:", err);
            setLoaded(true);
        });
    }, []);

    // Core Save Data Effect (Debounced)
    useEffect(() => {
        if (!loaded) return;

        const timeoutId = setTimeout(() => {
            saveScratchpad(JSON.stringify(blocks)).catch(err => {
                console.error("Failed to save scratchpad:", err);
            });
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [blocks, loaded]);

    // Drag and Drop State
    const [draggedBlockId, setDraggedBlockId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);

    // State for drag click prevention
    const ignoreClickRef = useRef(false);
    const isDragInteractionRef = useRef(false);

    // Selection Handlers
    const handleMouseDown = (e) => {
        // Ignore if clicking on interactive elements
        if (e.target.closest('.block-content') ||
            e.target.closest('.block-controls') ||
            e.target.closest('.toggle-icon') ||
            e.target.closest('.todo-icon')) {

            // Clear block selection when entering edit mode, unless shift key (range extend?)
            // For simplicity, just clear it to avoid "delete" confusion.
            if (!e.shiftKey) {
                setSelectedBlockIds([]);
            }
            return;
        }

        setIsSelecting(true);
        setSelectionStart({ x: e.clientX, y: e.clientY });
        setSelectionBox({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
        isDragInteractionRef.current = false; // Reset drag interaction flag

        // Clear selection unless Shift is held
        if (!e.shiftKey) {
            setSelectedBlockIds([]);
        }
    };

    useEffect(() => {
        if (!isSelecting) return;

        const handleMouseMove = (e) => {
            // Mark as drag interaction if moved significantly
            // This prevents micro-movements from blocking regular clicks, though standard clicks usually don't move much
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

            // Find intersections
            const selected = [];
            const blockWrappers = document.querySelectorAll('.block-wrapper');
            blockWrappers.forEach(wrapper => {
                const rect = wrapper.getBoundingClientRect();
                // Check intersection
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
            // If this was a drag interaction, tell the click handler to ignore the next click
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
    }, [isSelecting, selectionStart]);


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
                if (b.id === id) continue;
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
            if (newBlocks.length === 0) {
                return [{ id: Date.now().toString(), type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }];
            }
            return newBlocks;
        });
    };

    const deleteBlocks = (ids) => {
        const removeBlocks = (list) => {
            const result = [];
            for (let b of list) {
                if (ids.includes(b.id)) continue;
                if (b.children && b.children.length > 0) {
                    result.push({ ...b, children: removeBlocks(b.children) });
                } else {
                    result.push(b);
                }
            }
            return result;
        };

        setBlocks(prev => {
            const newBlocks = removeBlocks(prev);
            if (newBlocks.length === 0) {
                return [{ id: Date.now().toString(), type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }];
            }
            return newBlocks;
        });
        setSelectedBlockIds([]);
    };

    const copySelectionToClipboard = () => {
        if (selectedBlockIds.length === 0) return;

        // Helper to flatten and check if selected
        const getSelectedForExport = (list) => {
            let result = [];
            for (let b of list) {
                if (selectedBlockIds.includes(b.id)) {
                    // Convert to markdown-ish
                    let prefix = '';
                    if (b.type === 'h1') prefix = '# ';
                    if (b.type === 'h2') prefix = '## ';
                    if (b.type === 'h3') prefix = '### ';
                    if (b.type === 'todo') prefix = b.checked ? '- [x] ' : '- [ ] ';
                    if (b.type === 'toggle') prefix = '> '; // Simple representation

                    result.push(`${prefix}${b.content}`);
                }
                if (b.children && b.children.length > 0) {
                    // Note: If parent is selected, typically children are considered selected visually in UI often, 
                    // but here we strictly select IDs. The user dragged over them. 
                    // Since dragging over parent usually covers children, they should be in the list.
                    result = [...result, ...getSelectedForExport(b.children)];
                }
            }
            return result;
        };

        const lines = getSelectedForExport(blocks);
        const text = lines.join('\n');

        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };


    const focusBlock = (id, options = {}) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({
            ...b,
            isFocused: true,
            focusTrigger: Date.now(),
            cursorAtEnd: options.cursorAtEnd
        }), prev));
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

    const updateBlock = (id, updates) => {
        if (updates.content !== undefined) {
            const text = updates.content;
            const commandTriggered = handleSlashCommandInput(text, id);
            if (commandTriggered) return;
        }
        setBlocks(prev => modifyBlocks(id, (b) => ({ ...b, ...updates }), prev));
    };

    const handleSlashCommandInput = (text, id) => {
        if (text === '/1') { convertToType(id, 'h1'); return true; }
        if (text === '/2') { convertToType(id, 'h2'); return true; }
        if (text === '/3') { convertToType(id, 'h3'); return true; }
        if (text === '/toggle') { convertToType(id, 'toggle'); return true; }
        if (text === '[]') { convertToType(id, 'todo'); return true; }
        return false;
    };

    const convertToType = (id, type, newContent = null) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({
            ...b,
            type,
            content: newContent !== null ? newContent : '',
        }), prev));
    };

    const addBlock = (afterId, type = 'p') => {
        const newBlock = {
            id: Date.now().toString(),
            type: type,
            content: '',
            children: [],
            isFocused: true,
            checked: false,
            isOpen: true
        };

        setBlocks(prev => {
            const deepInsert = (list) => {
                let res = [];
                for (let i = 0; i < list.length; i++) {
                    const b = list[i];
                    res.push({ ...b, isFocused: false });
                    if (b.id === afterId) {
                        if (b.type === 'toggle' && b.isOpen) {
                            res[res.length - 1].children = [newBlock, ...b.children];
                        } else {
                            res.push(newBlock);
                        }
                    } else if (b.children.length > 0) {
                        res[res.length - 1].children = deepInsert(b.children);
                    }
                }
                return res;
            };
            return deepInsert(prev);
        });
    };

    const appendBlock = () => {
        const newBlock = { id: Date.now().toString(), type: 'p', content: '', children: [], isFocused: true, checked: false, isOpen: true };
        setBlocks(prev => {
            const unfocusAll = (list) => {
                return list.map(b => ({
                    ...b,
                    isFocused: false,
                    children: b.children ? unfocusAll(b.children) : []
                }));
            };
            return [...unfocusAll(prev), newBlock];
        });
    };

    const handleContainerClick = (e) => {
        if (ignoreClickRef.current) {
            ignoreClickRef.current = false;
            return;
        }

        // Clear selection if clicking on empty space
        if (selectedBlockIds.length > 0) {
            const isBlockClick = e.target.closest('.block-wrapper') || e.target.closest('.block-controls');
            if (!isBlockClick) {
                setSelectedBlockIds([]);
            }
        }

        if (e.target.closest('.block-wrapper') || e.target.closest('.scratchpad-title')) {
            return;
        }

        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.content === '' && (!lastBlock.children || lastBlock.children.length === 0)) {
            focusBlock(lastBlock.id);
        } else {
            appendBlock();
        }
    };

    const findPreviousBlock = (id, list) => {
        let prev = null;
        let found = null;
        const traverse = (nodes) => {
            for (const node of nodes) {
                if (found) return;
                if (node.id === id) {
                    found = prev;
                    return;
                }
                prev = node;
                if (node.children && node.children.length > 0 && node.isOpen) {
                    traverse(node.children);
                }
            }
        };
        traverse(list);
        return found;
    };

    // Container level key handler for selection actions
    const handleContainerKeyDown = (e) => {
        if (selectedBlockIds.length > 0) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                deleteBlocks(selectedBlockIds);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelectionToClipboard();
                return;
            }
        }
    };

    const handleKeyDown = (e, block) => {
        const currentContent = e.target.innerText?.replace(/\u00A0/g, ' ').trim() || '';

        // Propagate key event to container handler for global actions if any blocks are selected
        if (selectedBlockIds.length > 0 && selectedBlockIds.includes(block.id)) {
            if (e.key === 'Backspace' || e.key === 'Delete' || ((e.ctrlKey || e.metaKey) && e.key === 'c')) {
                handleContainerKeyDown(e);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (block.type === 'todo') {
                if (currentContent === '') {
                    convertToType(block.id, 'p');
                } else {
                    addBlock(block.id, 'todo');
                }
            } else {
                addBlock(block.id, 'p');
            }
        }
        if (e.key === 'Backspace' && currentContent === '') {
            if (block.type === 'todo' || block.type === 'toggle' || block.type.startsWith('h')) {
                e.preventDefault();
                convertToType(block.id, 'p');
            } else {
                e.preventDefault();
                const prev = findPreviousBlock(block.id, blocks);
                if (prev) {
                    focusBlock(prev.id, { cursorAtEnd: true });
                    deleteBlock(block.id);
                }
            }
        }
    };

    return (
        <div
            className={`scratchpad-container ${theme}`}
            onClick={handleContainerClick}
            onMouseDown={handleMouseDown}
            onKeyDown={handleContainerKeyDown}
            tabIndex="0" // Make container focusable
        >
            {/* Selection Box Overlay */}
            {selectionBox && (
                <div
                    className="selection-box"
                    style={{
                        left: selectionBox.left,
                        top: selectionBox.top,
                        width: selectionBox.width,
                        height: selectionBox.height
                    }}
                />
            )}

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
                        selectedBlockIds={selectedBlockIds}
                    />
                ))}
            </div>
            {/* Slash Menu Popup would go here */}
        </div>
    );
}

export default Scratchpad;
