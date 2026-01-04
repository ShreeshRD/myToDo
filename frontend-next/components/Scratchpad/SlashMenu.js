import { MdOutlineTitle, MdCheckBoxOutlineBlank, MdChevronRight } from "react-icons/md";

const MENU_ITEMS = [
    { id: 'h1', label: 'Heading 1', icon: <MdOutlineTitle style={{ fontSize: '1.4em' }} />, shortcut: '/1' },
    { id: 'h2', label: 'Heading 2', icon: <MdOutlineTitle style={{ fontSize: '1.2em' }} />, shortcut: '/2' },
    { id: 'h3', label: 'Heading 3', icon: <MdOutlineTitle style={{ fontSize: '1.1em' }} />, shortcut: '/3' },
    { id: 'todo', label: 'To-do list', icon: <MdCheckBoxOutlineBlank />, shortcut: '[]' },
    { id: 'toggle', label: 'Toggle list', icon: <MdChevronRight />, shortcut: '/toggle' },
];


const getFilteredItems = (query) => {
    if (!query) return MENU_ITEMS;
    const lowerQuery = query.toLowerCase();
    return MENU_ITEMS.filter(item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.shortcut.toLowerCase().includes(lowerQuery)
    );
};


const SlashMenu = ({ position, selectedIndex, query, onSelect }) => {
    if (!position) return null;

    const filteredItems = getFilteredItems(query);

    if (filteredItems.length === 0) return null;

    return (
        <div
            className="slash-menu"
            style={{ top: position.y, left: position.x }}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from block
        >
            {filteredItems.map((item, index) => (
                <div
                    key={item.id}
                    className={`slash-menu-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(item.id)}
                >
                    <span className="item-icon">{item.icon}</span>
                    <span className="item-label">{item.label}</span>
                    <span className="item-shortcut">{item.shortcut}</span>
                </div>
            ))}
        </div>
    );
};

export { MENU_ITEMS };
export default SlashMenu;
