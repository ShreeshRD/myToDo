import React from 'react';

const Dropdown = ({ placeholder, items, handler }) => {

    return (
        <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                {placeholder}
            </button>
            <ul className="dropdown-menu">
                {items.map((item, index) => (
                    <li key={index} onClick={handler}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

export default Dropdown;