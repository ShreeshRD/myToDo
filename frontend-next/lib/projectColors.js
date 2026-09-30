// Stable colour per project name, used for the project dot/hash in the sidebar and task rows.
const PROJECT_COLORS = ['#5b5bd6', '#12a594', '#f5a524', '#e54666', '#8e4ec6', '#30a46c', '#0090ff', '#d6409f'];

export function projectColor(name) {
    if (!name || name === 'None') return 'var(--text-3)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}
