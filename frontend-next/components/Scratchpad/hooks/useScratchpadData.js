import { useState, useEffect } from 'react';
import { getScratchpad, saveScratchpad } from '../../../service';

export const useScratchpadData = () => {
    const [blocks, setBlocks] = useState([
        { id: '1', type: 'p', content: '', checked: false, isOpen: true, children: [], isFocused: true }
    ]);
    const [loaded, setLoaded] = useState(false);

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

    return { blocks, setBlocks, loaded };
};
