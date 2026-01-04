import React, { useRef, useEffect } from 'react';
import { MdCheckBoxOutlineBlank, MdCheckBox, MdDragIndicator, MdDelete } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { MENU_ITEMS } from './SlashMenu';


// Utility to set cursor to end of contentEditable
const setCursorToEnd = (element) => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
};

const Block = ({
    block,
    updateBlock,
    addBlock,
    deleteBlock,
    focusBlock,
    onKeyDown,
    theme,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    isDragging,
    dragOverId,
    dragOverPosition,
    selectedBlockIds,
    openSlashMenu,
    closeSlashMenu,
    navigateSlashMenu,
    handleSlashMenuSelect,
    slashMenu,
    setSlashQuery
}) => {

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

        // Close slash menu if the slash is removed
        if (slashMenu.isOpen && slashMenu.blockId === block.id) {
            if (!text.includes('/')) {
                closeSlashMenu();
            } else {
                // Extract text after the LAST slash
                const lastSlashIndex = text.lastIndexOf('/');
                const query = text.slice(lastSlashIndex + 1);
                setSlashQuery(query);
            }
        }

        // Avoid update if text is same to prevent cursor jumping
        if (text !== block.content) {
            const commandExecuted = updateBlock(block.id, { content: text });
            if (commandExecuted) {
                closeSlashMenu();
            }
        }
    };

    const handleLocalKeyDown = (e) => {
        if (slashMenu.isOpen && slashMenu.blockId === block.id) {
            const lowerQuery = slashMenu.query?.toLowerCase() || '';
            const filteredItems = MENU_ITEMS.filter(item =>
                item.label.toLowerCase().includes(lowerQuery) ||
                item.shortcut.toLowerCase().includes(lowerQuery)
            );

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateSlashMenu(1, filteredItems.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateSlashMenu(-1, filteredItems.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems.length > 0) {
                    const selectedType = filteredItems[slashMenu.selectedIndex].id;
                    handleSlashMenuSelect(selectedType);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSlashMenu();
                return;
            }
        }

        if (e.key === '/') {
            const container = e.currentTarget.closest('.scratchpad-container');
            // Increased delay slightly to ensures caret position and selection is fully captured
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && container) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    // Guard against invalid rects
                    if (rect.width === 0 && rect.height === 0) return;

                    openSlashMenu(block.id, {
                        x: rect.left - containerRect.left + container.scrollLeft,
                        y: rect.bottom - containerRect.top + container.scrollTop
                    });
                }
            }, 50);
        }


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

    // Robust empty check
    const isEmpty = !block.content || block.content.trim() === '';
    const placeholderText = block.type === 'p' ? "Type '/' for commands" : "List item...";

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
                    className={`block-content ${block.type} ${block.checked ? 'checked' : ''} ${isEmpty ? 'is-empty' : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleLocalKeyDown}
                    placeholder={placeholderText}
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
                            openSlashMenu={openSlashMenu}
                            closeSlashMenu={closeSlashMenu}
                            navigateSlashMenu={navigateSlashMenu}
                            handleSlashMenuSelect={handleSlashMenuSelect}
                            slashMenu={slashMenu}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Block;
