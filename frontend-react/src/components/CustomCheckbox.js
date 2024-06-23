import React from 'react';
import './mycheckbox.css';

const CustomCheckbox = ({ checked, onChange, icon, checkedIcon }) => {

    return (
        <button
            className="checkmark"
            onClick={onChange}
        >
            {checked ? checkedIcon : icon}
        </button>
    );
};

export default CustomCheckbox;