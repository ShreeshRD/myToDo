import { useCallback } from 'react';

export const useScratchpadOperations = (blocks, setBlocks, setSelectedBlockIds, selectedBlockIds) => {

    const modifyBlocks = useCallback((id, callback, list) => {
        const recurse = (currentList) => {
            return currentList.map(block => {
                if (block.id === id) {
                    return callback(block);
                }
                if (block.children && block.children.length > 0) {
                    return { ...block, children: recurse(block.children) };
                }
                return block;
            });
        };
        return recurse(list);
    }, []);

    const deleteBlock = useCallback((id) => {
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
    }, [setBlocks]);

    const deleteBlocks = useCallback((ids) => {
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
    }, [setBlocks, setSelectedBlockIds]);

    const copySelectionToClipboard = useCallback(() => {
        if (selectedBlockIds.length === 0) return;

        const getSelectedForExport = (list) => {
            let result = [];
            for (let b of list) {
                if (selectedBlockIds.includes(b.id)) {
                    let prefix = '';
                    if (b.type === 'h1') prefix = '# ';
                    if (b.type === 'h2') prefix = '## ';
                    if (b.type === 'h3') prefix = '### ';
                    if (b.type === 'todo') prefix = b.checked ? '- [x] ' : '- [ ] ';
                    if (b.type === 'toggle') prefix = '> ';

                    result.push(`${prefix}${b.content}`);
                }
                if (b.children && b.children.length > 0) {
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
    }, [blocks, selectedBlockIds]);

    const focusBlock = useCallback((id, options = {}) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({
            ...b,
            isFocused: true,
            focusTrigger: Date.now(),
            cursorAtEnd: options.cursorAtEnd
        }), prev));
    }, [setBlocks, modifyBlocks]);

    const convertToType = useCallback((id, type, newContent = null) => {
        setBlocks(prev => modifyBlocks(id, (b) => ({
            ...b,
            type,
            content: newContent !== null ? newContent : '',
        }), prev));
    }, [setBlocks, modifyBlocks]);

    const handleSlashCommandInput = useCallback((text, id) => {
        if (text === '/1') { convertToType(id, 'h1'); return true; }
        if (text === '/2') { convertToType(id, 'h2'); return true; }
        if (text === '/3') { convertToType(id, 'h3'); return true; }
        if (text === '/toggle') { convertToType(id, 'toggle'); return true; }
        if (text === '[]') { convertToType(id, 'todo'); return true; }
        if (text === '/[]') { convertToType(id, 'todo'); return true; }
        return false;
    }, [convertToType]);

    const updateBlock = useCallback((id, updates) => {
        if (updates.content !== undefined) {
            const text = updates.content;
            const commandTriggered = handleSlashCommandInput(text, id);
            if (commandTriggered) return true;
        }
        setBlocks(prev => modifyBlocks(id, (b) => ({ ...b, ...updates }), prev));
        return false;
    }, [setBlocks, modifyBlocks, handleSlashCommandInput]);

    const addBlock = useCallback((afterId, type = 'p') => {
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
    }, [setBlocks]);

    const appendBlock = useCallback(() => {
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
    }, [setBlocks]);

    return {
        updateBlock,
        addBlock,
        deleteBlock,
        deleteBlocks,
        focusBlock,
        convertToType,
        copySelectionToClipboard,
        appendBlock
    };
};
