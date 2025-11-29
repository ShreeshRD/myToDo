
/**
 * Calculates the predecessor task ID for a drag-and-drop operation.
 * 
 * @param {Object} destination - The destination object from react-beautiful-dnd (index, droppableId)
 * @param {Object} source - The source object from react-beautiful-dnd (index, droppableId)
 * @param {Array} filteredDestTasks - The array of tasks currently visible in the destination list (filtered view)
 * @returns {string|null} The ID of the task that should precede the moved task, or null if it should be at the top.
 */
export function calculatePredecessor(destination, source, filteredDestTasks) {
    if (!destination || !filteredDestTasks) {
        return null;
    }

    let predecessorIndex = destination.index - 1;

    // Calculate correct predecessor index based on drag direction
    // If moving down in the same list, the item is removed from above, so the index shifts.
    // We want to insert AFTER the item that is currently at destination.index (in the filtered view)
    // because that item will shift up to fill the gap.
    if (source.droppableId === destination.droppableId && source.index < destination.index) {
        predecessorIndex = destination.index;
    }

    if (predecessorIndex >= 0) {
        // Find the task that's at the calculated predecessor position in the FILTERED view
        const filteredPredecessor = filteredDestTasks[predecessorIndex];

        if (filteredPredecessor) {
            // Return the ID of the task found at the predecessor position
            return filteredPredecessor.id.toString();
        }
    }

    return null;
}
