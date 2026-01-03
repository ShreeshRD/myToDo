'use client';

import React, { useRef } from 'react';
import '../../styles/scratchpad.scss';
import Block from './Block';
import SlashMenu from './SlashMenu';
import { useScratchpadData } from './hooks/useScratchpadData';
import { useScratchpadSelection } from './hooks/useScratchpadSelection';
import { useScratchpadDnD } from './hooks/useScratchpadDnD';
import { useScratchpadOperations } from './hooks/useScratchpadOperations';
import { useScratchpadSlashMenu } from './hooks/useScratchpadSlashMenu';


function Scratchpad({ theme }) {
    const ignoreClickRef = useRef(false);
    const isDragInteractionRef = useRef(false);

    // Data Hook
    const { blocks, setBlocks } = useScratchpadData();

    // Selection Hook
    const {
        selectedBlockIds,
        setSelectedBlockIds,
        selectionBox,
        handleMouseDown
    } = useScratchpadSelection(ignoreClickRef, isDragInteractionRef);

    // DnD Hook
    const {
        draggedBlockId,
        dragOverId,
        dragOverPosition,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDrop
    } = useScratchpadDnD(setBlocks);

    // Operations Hook
    const {
        updateBlock,
        addBlock,
        deleteBlock,
        deleteBlocks,
        focusBlock,
        convertToType,
        copySelectionToClipboard,
        appendBlock
    } = useScratchpadOperations(blocks, setBlocks, setSelectedBlockIds, selectedBlockIds);

    // Slash Menu Hook
    const {
        slashMenu,
        openSlashMenu,
        closeSlashMenu,
        handleSlashMenuSelect,
        navigateSlashMenu
    } = useScratchpadSlashMenu(convertToType);


    const handleContainerClick = (e) => {
        if (ignoreClickRef.current) {
            ignoreClickRef.current = false;
            return;
        }

        if (selectedBlockIds.length > 0) {
            const isBlockClick = e.target.closest('.block-wrapper') || e.target.closest('.block-controls');
            if (!isBlockClick) {
                setSelectedBlockIds([]);
            }
        }

        if (slashMenu.isOpen) {
            closeSlashMenu();
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
            tabIndex="0"
        >
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
                        openSlashMenu={openSlashMenu}
                        closeSlashMenu={closeSlashMenu}
                        navigateSlashMenu={navigateSlashMenu}
                        handleSlashMenuSelect={handleSlashMenuSelect}
                        slashMenu={slashMenu}
                    />

                ))}
            </div>
            <SlashMenu
                position={slashMenu.position}
                selectedIndex={slashMenu.selectedIndex}
                onSelect={handleSlashMenuSelect}
            />
        </div>

    );
}

export default Scratchpad;
