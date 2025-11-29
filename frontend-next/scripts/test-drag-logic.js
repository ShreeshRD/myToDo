
import { calculatePredecessor } from '../lib/dragUtils.js';

// Mock Tasks
const tasks = [
    { id: '1', name: 'Task A' },
    { id: '2', name: 'Task B' },
    { id: '3', name: 'Task C' },
    { id: '4', name: 'Task D' }
];

function runTest(name, destination, source, filteredTasks, expectedPredecessorId) {
    const result = calculatePredecessor(destination, source, filteredTasks);
    const passed = result === expectedPredecessorId;
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
    if (!passed) {
        console.log(`   Expected: ${expectedPredecessorId}, Got: ${result}`);
    }
    return passed;
}

console.log('Running Drag Logic Tests...\n');

let allPassed = true;

// Scenario 1: Move Down in Same List
// [A, B, C] -> Drag A (0) to 1 (below B)
// Expected: Insert after B (id: 2)
allPassed &= runTest(
    'Move Down: A(0) -> 1',
    { index: 1, droppableId: 'list1' },
    { index: 0, droppableId: 'list1' },
    tasks.slice(0, 3), // [A, B, C]
    '2'
);

// Scenario 2: Move Up in Same List
// [A, B, C] -> Drag B (1) to 0 (above A)
// Expected: Insert at top (null)
allPassed &= runTest(
    'Move Up: B(1) -> 0',
    { index: 0, droppableId: 'list1' },
    { index: 1, droppableId: 'list1' },
    tasks.slice(0, 3), // [A, B, C]
    null
);

// Scenario 3: Move Down to End
// [A, B, C] -> Drag A (0) to 2 (below C)
// Expected: Insert after C (id: 3)
allPassed &= runTest(
    'Move Down to End: A(0) -> 2',
    { index: 2, droppableId: 'list1' },
    { index: 0, droppableId: 'list1' },
    tasks.slice(0, 3), // [A, B, C]
    '3'
);

// Scenario 4: Move Up from End
// [A, B, C] -> Drag C (2) to 1 (between A and B)
// Expected: Insert after A (id: 1)
allPassed &= runTest(
    'Move Up from End: C(2) -> 1',
    { index: 1, droppableId: 'list1' },
    { index: 2, droppableId: 'list1' },
    tasks.slice(0, 3), // [A, B, C]
    '1'
);

// Scenario 5: Filtered List - Move Down
// Unfiltered: [A, B, C, D]
// Filtered: [A, C, D] (B hidden)
// Drag A (0) to 1 (below C)
// Expected: Insert after C (id: 3)
const filteredTasks = [tasks[0], tasks[2], tasks[3]]; // [A, C, D]
allPassed &= runTest(
    'Filtered Move Down: A(0) -> 1',
    { index: 1, droppableId: 'list1' },
    { index: 0, droppableId: 'list1' },
    filteredTasks,
    '3'
);

// Scenario 6: Filtered List - Move Up
// Filtered: [A, C, D]
// Drag D (2) to 0 (above A)
// Expected: Insert at top (null)
allPassed &= runTest(
    'Filtered Move Up: D(2) -> 0',
    { index: 0, droppableId: 'list1' },
    { index: 2, droppableId: 'list1' },
    filteredTasks,
    null
);

// Scenario 7: Cross List (Different Droppable)
// Source: List 2, Dest: List 1
// Drag X to 1 (between A and B)
// Expected: Insert after A (id: 1)
// Note: Cross list is treated as "inserting new item", so index logic is standard (index - 1)
allPassed &= runTest(
    'Cross List: X -> 1',
    { index: 1, droppableId: 'list1' },
    { index: 0, droppableId: 'list2' }, // Different source
    tasks.slice(0, 3), // [A, B, C]
    '1'
);

console.log('\n' + (allPassed ? '🎉 All Tests Passed!' : '💥 Some Tests Failed'));
process.exit(allPassed ? 0 : 1);
