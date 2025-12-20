import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scratchpad from '../Scratchpad';

// Mock scrollIntoView since it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Scratchpad Component', () => {
    test('renders correctly', () => {
        render(<Scratchpad theme="light" />);
        expect(screen.getByText('Scratchpad')).toBeInTheDocument();
    });

    test('appends a new block when clicking the container if last block is not empty', () => {
        const { container } = render(<Scratchpad theme="light" />);

        // Find the main container
        const scratchpadContainer = container.querySelector('.scratchpad-container');

        // Initial blocks count should be 1, and it's empty by default.
        // We need to make the last block non-empty first.
        const blockContent = container.querySelector('.block-content');
        fireEvent.input(blockContent, { target: { innerText: 'Some content' } });

        // Click on the container
        fireEvent.click(scratchpadContainer);

        // Should have 2 blocks now
        const updatedBlocks = container.querySelectorAll('.block-wrapper');
        expect(updatedBlocks.length).toBe(2);
    });

    test('focuses last block if it is empty when clicking container', () => {
        const { container } = render(<Scratchpad theme="light" />);
        const scratchpadContainer = container.querySelector('.scratchpad-container');

        // Initial state: 1 empty block
        const blockContent = container.querySelector('.block-content');
        // Spy on focus
        const focusSpy = jest.spyOn(blockContent, 'focus');

        // Click on container
        fireEvent.click(scratchpadContainer);

        // Should STILL be 1 block
        const updatedBlocks = container.querySelectorAll('.block-wrapper');
        expect(updatedBlocks.length).toBe(1);

        // Verify focus was called
        expect(focusSpy).toHaveBeenCalled();
    });

    test('does not append block when clicking on title', () => {
        const { container } = render(<Scratchpad theme="light" />);
        const title = screen.getByText('Scratchpad');

        // Click on title
        fireEvent.click(title);

        // Should still be 1 block
        const blocks = container.querySelectorAll('.block-wrapper');
        expect(blocks.length).toBe(1);
    });

    test('does not append block when clicking on an existing block', () => {
        const { container } = render(<Scratchpad theme="light" />);

        // Find the existing block's content editable area
        const blockContent = container.querySelector('.block-content');

        // Click on it
        fireEvent.click(blockContent);

        // Should still be 1 block
        const blocks = container.querySelectorAll('.block-wrapper');
        expect(blocks.length).toBe(1);
    });
});
