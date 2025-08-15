import React from 'react';
import './mycheckbox.scss';

const CustomCheckbox = ({ checked, onChange, icon, checkedIcon, letter = '' }) => {

    return (
        <div className="checkmark" onClick={onChange} data-testid={`checkbox-${letter}`}>
            {checked ? checkedIcon : icon}
            {letter && <span className={`checkmark-letter${checked ? ' checked' : ''}`}>{letter}</span>}
        </div>
    );
};

export default CustomCheckbox;