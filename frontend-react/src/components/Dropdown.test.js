
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dropdown from './Dropdown';

describe('Dropdown', () => {
  const items = ['Item 1', 'Item 2', 'Item 3'];

  test('renders with the correct placeholder', () => {
    render(<Dropdown placeholder="Select an item" items={items} handler={() => {}} />);
    expect(screen.getByText('Select an item')).toBeInTheDocument();
  });

  test('renders all dropdown items', () => {
    render(<Dropdown placeholder="Select an item" items={items} handler={() => {}} />);
    const dropdownButton = screen.getByText('Select an item');
    fireEvent.click(dropdownButton); // Assuming this opens the dropdown

    // Note: Testing for the visibility of dropdown items can be tricky with standard DOM testing.
    // This test assumes the items are rendered in the DOM when the component is rendered.
    items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  test('calls the handler when an item is clicked', () => {
    const handleClick = jest.fn();
    render(<Dropdown placeholder="Select an item" items={items} handler={handleClick} />);
    const dropdownButton = screen.getByText('Select an item');
    fireEvent.click(dropdownButton);

    const itemToClick = screen.getByText('Item 2');
    fireEvent.click(itemToClick);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
