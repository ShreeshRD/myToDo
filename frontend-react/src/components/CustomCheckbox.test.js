
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomCheckbox from './CustomCheckbox';
import { FaRegCircle, FaCircle } from 'react-icons/fa';

describe('CustomCheckbox', () => {
  const uncheckedIcon = <FaRegCircle data-testid="unchecked-icon" />;
  const checkedIcon = <FaCircle data-testid="checked-icon" />;

  test('renders the unchecked icon when not checked', () => {
    render(
      <CustomCheckbox
        checked={false}
        onChange={() => {}}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
      />
    );
    expect(screen.getByTestId('unchecked-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('checked-icon')).not.toBeInTheDocument();
  });

  test('renders the checked icon when checked', () => {
    render(
      <CustomCheckbox
        checked={true}
        onChange={() => {}}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
      />
    );
    expect(screen.getByTestId('checked-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('unchecked-icon')).not.toBeInTheDocument();
  });

  test('calls the onChange handler when clicked', () => {
    const handleChange = jest.fn();
    render(
      <CustomCheckbox
        checked={false}
        onChange={handleChange}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
      />
    );
    fireEvent.click(screen.getByTestId('unchecked-icon'));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('displays the letter when provided', () => {
    render(
      <CustomCheckbox
        checked={false}
        onChange={() => {}}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
        letter="M"
      />
    );
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  test('applies the correct class to the letter when checked', () => {
    const { rerender } = render(
      <CustomCheckbox
        checked={false}
        onChange={() => {}}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
        letter="M"
      />
    );
    expect(screen.getByText('M')).not.toHaveClass('checked');

    rerender(
      <CustomCheckbox
        checked={true}
        onChange={() => {}}
        icon={uncheckedIcon}
        checkedIcon={checkedIcon}
        letter="M"
      />
    );
    expect(screen.getByText('M')).toHaveClass('checked');
  });
});
