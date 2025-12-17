'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/scratchpad.scss';
import { CiMenuKebab } from "react-icons/ci";
import { MdCheckBoxOutlineBlank, MdCheckBox } from "react-icons/md";
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
const Block = ({ block, updateBlock, addBlock, deleteBlock, focusBlock, onKeyDown, theme }) => {
    const contentRef = useRef(null);

    // Sync content with state manually to preserve cursor position during typing
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerText !== block.content) {
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

    return (
        <div className={`block-wrapper ${block.type} ${theme}`}>
            <div className="block-content-row">
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

    const updateBlock = (id, updates) => {
        // Special check for slash commands in content
        if (updates.content !== undefined) {
            const text = updates.content;
            handleSlashCommandInput(text, id);
        }
        setBlocks(prev => modifyBlocks(id, (b) => ({ ...b, ...updates }), prev));
    };

    const handleSlashCommandInput = (text, id) => {
        // Check for exact matches first for shortcuts
        if (text === '/1') {
            convertToType(id, 'h1');
            return;
        }
        if (text === '/2') {
            convertToType(id, 'h2');
            return;
        }
        if (text === '/3') {
            convertToType(id, 'h3');
            return;
        }
        if (text === '/toggle') {
            convertToType(id, 'toggle');
            return;
        }
        // Checklist pattern "[] "
        if (text.startsWith('[] ')) {
            convertToType(id, 'todo', text.substring(3)); // Remove "[] "
            return;
        }

        // Show menu if ends with /
        if (text.endsWith('/')) {
            const blockEl = document.getElementById(`block-${id}`); // We need to assign IDs to wrapper or find focused
            // Actually, we can just position it near cursor or center for now.
            // Let's use a simple approach: if '/' is typed, open menu.
        }
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
            // deleteBlock(block.id);
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
                        // deleteBlock={deleteBlock}
                        // focusBlock={focusBlock}
                        onKeyDown={handleKeyDown}
                        theme={theme}
                    />
                ))}
            </div>
            {/* Slash Menu Popup would go here */}
        </div>
    );
}

export default Scratchpad;
