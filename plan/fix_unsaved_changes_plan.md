# Fix: Unsaved Changes / Data Revert on Refresh
## Step-by-Step Implementation Plan

---

## Diagnosis Summary (from flow_analysis.md)

**Confirmed by user testing:**
- All backend requests return **200** → backend IS writing to DB successfully
- On refresh: first request returns **304** (browser HTTP cache), followed by a burst of 200s
- Pending changes were already cleared (because 200 = success), so `applyPendingChanges` has nothing to replay
- **Root cause of reverts**: the initial `GET /todo/allbydate` on refresh hits the browser cache and returns stale pre-drag data. Since there are no pending changes left in localStorage, the stale data overwrites the UI.

**Secondary causes to also fix:**
- `calculatePredecessor` (dragUtils.js) uses the project-filtered task list as its reference, but `moveTask` inserts into the unfiltered list. With filters off this is currently harmless but will break when filters are used.
- No `CREATE_TASK` or `DELETE_TASK` pending change types exist — creation and deletion are not recoverable if the backend goes down mid-operation.
- `removeTask` fires `dayOrder` rebalancing calls fire-and-forget after deletion — no pending change, no retry.
- `completedTasks` is not patched by `applyPendingChanges`.

---

## Solution Strategy

Three-layered approach:

1. **Layer 1 — Fix 304 cache (primary fix)**: Bust the browser cache on the fetch GET request so the frontend always reads fresh DB data on refresh.
2. **Layer 2 — localStorage snapshot cache (user's request)**: After every state mutation, snapshot the full task state to localStorage with a timestamp. On fetch, if the local snapshot is newer than what was last written to the backend, serve the local snapshot while the fetch runs in the background. This makes the UI feel instant on refresh even on slow backend.
3. **Layer 3 — Fix structural gaps**: Add `CREATE_TASK` and `DELETE_TASK` pending change types; fix the filtered→unfiltered predecessor index mapping.

---

## Files to Modify

| File | Change |
|---|---|
| `frontend-next/service.js` | Add cache-busting `timestamp` param to `getTasks` |
| `frontend-next/lib/pendingChanges.js` | Add `CREATE_TASK` and `DELETE_TASK` types to `applyPendingChanges`; add snapshot save/load functions |
| `frontend-next/hooks/useTaskManagement.js` | Snapshot state to localStorage after every mutation; load snapshot on startup; queue pending change for delete; fix `removeTask` dayOrder retry |
| `frontend-next/contexts/TaskContext.js` | Queue pending change for `addTask` (CREATE_TASK); fix `handleDragEnd` to pass unfiltered task list to `calculatePredecessor` |
| `frontend-next/lib/dragUtils.js` | Update `calculatePredecessor` to accept both filtered and unfiltered lists and resolve the correct insert index |

---

## Step-by-Step Instructions

---

### Step 1 — Bust the Browser HTTP Cache on Fetch

**File**: `frontend-next/service.js`

**Problem**: `GET /todo/allbydate` returns 304 on refresh because the browser caches the response. The pending changes are already cleared (200s), so `applyPendingChanges` doesn't fix it.

**Change**: Append a `_t` (timestamp) query param to the URL so each refresh is treated as a unique request by the browser.

```diff
// In getTasks():
- return axios.get(API_URL + "/all" + more)
+ return axios.get(API_URL + "/all" + more, {
+     params: { _t: Date.now() },
+     headers: { 'Cache-Control': 'no-cache' }
+ })
```

> This is the single highest-impact fix. It prevents the 304 stale-data problem entirely.

---

### Step 2 — Add Full-State Snapshot to localStorage

**File**: `frontend-next/lib/pendingChanges.js`

**Purpose**: Instead of only tracking *what changed*, also snapshot *the entire current state* so that on refresh, the frontend can serve the latest local view immediately.

Add these new exported functions at the bottom of `pendingChanges.js`:

```javascript
const TASK_SNAPSHOT_KEY = 'todo-task-snapshot';

/**
 * Save a full snapshot of the current task state with a timestamp.
 * Call this after every mutation (move, update, add, delete).
 * @param {{ taskDays: Object, overdueTasks: Object, completedTasks: Object }} state
 */
export const saveTaskSnapshot = (state) => {
    try {
        const snapshot = {
            timestamp: Date.now(),
            taskDays: state.taskDays,
            overdueTasks: state.overdueTasks,
            completedTasks: state.completedTasks,
        };
        localStorage.setItem(TASK_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.error('Error saving task snapshot:', error);
    }
};

/**
 * Load the most recent task snapshot from localStorage.
 * @returns {{ timestamp: number, taskDays, overdueTasks, completedTasks } | null}
 */
export const loadTaskSnapshot = () => {
    try {
        const stored = localStorage.getItem(TASK_SNAPSHOT_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error loading task snapshot:', error);
        return null;
    }
};

/**
 * Clear the task snapshot (call after a successful confirmed fetch).
 */
export const clearTaskSnapshot = () => {
    try {
        localStorage.removeItem(TASK_SNAPSHOT_KEY);
    } catch (error) {
        console.error('Error clearing task snapshot:', error);
    }
};
```

Also add `CREATE_TASK` and `DELETE_TASK` to `applyPendingChanges` inside the `for (const change of sortedChanges)` loop, after the existing `DELETE_TASK` case:

```javascript
case 'CREATE_TASK': {
    // Re-add a task that was created but not yet confirmed
    const { taskData } = change;
    if (!taskData || !taskData.taskDate) break;
    const d = taskData.taskDate;
    if (!modifiedTaskDays[d]) modifiedTaskDays[d] = [];
    // Only add if not already present (backend may have saved it)
    const alreadyExists = modifiedTaskDays[d].some(
        t => t.id?.toString() === taskData.id?.toString()
    );
    if (!alreadyExists) {
        modifiedTaskDays[d] = [...modifiedTaskDays[d], taskData]
            .sort((a, b) => a.dayOrder - b.dayOrder);
    }
    break;
}

case 'DELETE_TASK': {
    // existing DELETE_TASK case already handles overdue and taskDays removal
    // extend it to also search all dates if date is missing:
    const { taskId, date } = change;
    modifiedOverdue.overdue = modifiedOverdue.overdue.filter(
        t => t.id.toString() !== taskId.toString()
    );
    if (date && modifiedTaskDays[date]) {
        modifiedTaskDays[date] = modifiedTaskDays[date].filter(
            t => t.id.toString() !== taskId.toString()
        );
    } else {
        // Search all dates (date may be unknown if task was moved)
        for (const d in modifiedTaskDays) {
            modifiedTaskDays[d] = modifiedTaskDays[d].filter(
                t => t.id.toString() !== taskId.toString()
            );
        }
    }
    break;
}
```

> **Note**: The existing `DELETE_TASK` case only removes from `modifiedTaskDays[date]` if date is known. The above extends it to search all dates. Remove the old `DELETE_TASK` case and replace with this version.

---

### Step 3 — Load Snapshot on Startup (Cache-First)

**File**: `frontend-next/hooks/useTaskManagement.js`

**Purpose**: On page load, immediately serve the localStorage snapshot while the backend fetch runs in the background. If the snapshot is newer, keep it; if backend returns fresher data, update state.

**At the top of `useTaskManagement`**, import the new functions:

```diff
 import {
     addPendingChange,
     removePendingChange,
     applyPendingChanges,
+    saveTaskSnapshot,
+    loadTaskSnapshot,
 } from '../lib/pendingChanges';
```

**In the initial `useEffect` that calls `fetchTasks`**, load the snapshot first:

```diff
 useEffect(() => {
+    // Immediately load snapshot from localStorage (cache-first)
+    const snapshot = loadTaskSnapshot();
+    if (snapshot) {
+        setTaskDays(snapshot.taskDays || {});
+        setOverdueTasks(snapshot.overdueTasks || { overdue: [] });
+        setCompletedTasks(snapshot.completedTasks || {});
+    }
     const timer = setTimeout(() => fetchTasks(), 0);
     return () => clearTimeout(timer);
 }, [fetchTasks]);
```

**In `fetchTasks`**, after setting final state, call `saveTaskSnapshot` with the confirmed backend data (which is now the ground truth). This keeps the snapshot fresh with confirmed data:

```diff
 // After applying pending changes and calling setTaskDays / setOverdueTasks:
 setOverdueTasks(mergedOverdue);
 setTaskDays(mergedTaskDays);
+// Save confirmed state snapshot so next refresh starts here
+saveTaskSnapshot({
+    taskDays: mergedTaskDays,
+    overdueTasks: mergedOverdue,
+    completedTasks: newCompletedTasks,
+});
```

**After each mutation** (at the end of `updateTask`, `moveTask`, `removeTask`, `addToFrontend`), call `saveTaskSnapshot` with the latest React state. Because React state updates are async, use the functional form:

In `moveTask`, after the `setTaskDays(...)` call:
```javascript
// Save snapshot with latest state
saveTaskSnapshot({
    taskDays: { ...taskDays, [destDate]: updatedDestList },
    overdueTasks: isOverdue ? { ...overdueTasks, overdue: overdueTasks.overdue.filter(t => t.id.toString() !== taskId) } : overdueTasks,
    completedTasks: completedTasks
});
```

In `updateTask`, after `setTaskDays` / `setOverdueTasks` in the field-update branch:
```javascript
// At the end of the synchronous part of updateTask:
// (compute newTaskDays and newOverdue inline or use latest values)
saveTaskSnapshot({ taskDays: updatedTaskDays, overdueTasks, completedTasks });
```

In `removeTask`, after `setTaskDays` / `setOverdueTasks`:
```javascript
saveTaskSnapshot({ taskDays: updatedTaskDays, overdueTasks, completedTasks });
```

> **Important**: Because React state is captured by closure, the `taskDays` you pass to `saveTaskSnapshot` inside each mutation function should be the **newly computed** value (the one you're about to pass to the setter), not the stale `taskDays` variable from the closure. Each mutation already builds a local `updatedTaskDays` or `updatedDestList` — use those.

---

### Step 4 — Add CREATE_TASK Pending Change

**File**: `frontend-next/contexts/TaskContext.js`

**Problem**: `addTask` is awaited but if it fails nothing is queued. Task is silently lost.

**Change**: Wrap `addTask` in `onPopupClose` with a pending change:

```diff
 import {
     addPendingChange,
     removePendingChange,
+    saveTaskSnapshot,
 } from '../lib/pendingChanges';

 // In onPopupClose, replace the addTask block:
-let task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration, longTerm);
+let task;
+try {
+    task = await addTask(taskName, dateChoice, projectChoice, priority, repeatType, repeatDuration, longTerm);
+    // Task saved to backend — no pending change needed
+} catch (err) {
+    // Backend unreachable — create a temporary task object with a local ID
+    console.warn('addTask backend failed, queuing CREATE_TASK pending change');
+    const tempTask = {
+        id: `local-${Date.now()}`,
+        name: taskName,
+        taskDate: dateChoice,
+        category: projectChoice,
+        priority,
+        repeatType,
+        repeatDuration,
+        longTerm,
+        dayOrder: 9999,
+        complete: false,
+        inProgress: false,
+    };
+    addPendingChange({ type: 'CREATE_TASK', taskData: tempTask });
+    task = tempTask;
+}
```

> Note: The `local-` prefixed ID is temporary. When `applyPendingChanges` replays the CREATE_TASK, it will add this task to the view. The next time the backend is reachable, `fetchTasks` will not find the local ID in the DB — a future improvement would be to retry the POST at that point. For now this prevents a silent data loss.

---

### Step 5 — Add DELETE_TASK Pending Change

**File**: `frontend-next/hooks/useTaskManagement.js`

**Problem**: `removeTask` awaits `deleteTask` but queues no pending change. If the DELETE fails, the task reappears on refresh with no indication.

**Change**: Add optimistic delete with pending change:

```diff
 const removeTask = async (taskId, date, update = false) => {
+    // 1. Queue pending delete so that if backend fails, the task stays removed visually on refresh
+    const pendingId = addPendingChange({
+        type: 'DELETE_TASK',
+        taskId: taskId.toString(),
+        date: date,
+    });
+
     try {
         const task_completed = await deleteTask(taskId);
+        // 2. Backend confirmed — remove pending change
+        removePendingChange(pendingId);
         // ... rest of existing code unchanged ...
     } catch (error) {
+        // 3. Keep pending change so task stays removed on next load
         console.error(`Error deleting task with id ${taskId}:`, error);
     }
 };
```

Also import `addPendingChange` and `removePendingChange` at the top of `useTaskManagement.js` (they're already imported, just adding `DELETE_TASK` usage).

---

### Step 6 — Fix Filtered→Unfiltered Predecessor Index Mapping

**File**: `frontend-next/lib/dragUtils.js` and `frontend-next/contexts/TaskContext.js`

**Problem**: `calculatePredecessor` receives `filteredDestTasks` (project-filtered). It finds a predecessor task from that filtered list. `moveTask` then searches for that predecessor in the **unfiltered** `taskDays[destDate]`. The predecessor task ID is correct — `moveTask` searches by `.id`, not index. So the bug is subtler: the **direction logic** in `calculatePredecessor` uses `destination.index` from react-beautiful-dnd, which counts only rendered (filtered) items. This index is passed to `filteredDestTasks[predecessorIndex]` which IS correct for the filtered view.

The real issue is when `source.droppableId === destination.droppableId` (same-day reorder). When moving DOWN, `predecessorIndex = destination.index` — meaning we want the item at `destination.index` in the filtered list. This item will shift up after the move. `moveTask` finds this task by ID in the unfiltered list and inserts AFTER it. This is correct **as long as the filter is off**.

When filter is ON: the item at `destination.index` in the filtered view may not be at the same relative position in the unfiltered list (hidden tasks exist between them). The predecessor ID is still correct, but the resulting `insertIndex` in the unfiltered list places the task after a different relative position.

**Fix**: No change needed to `dragUtils.js` for the filter-off case (works correctly). To future-proof it for filters:

In `TaskContext.handleDragEnd`, pass the **unfiltered** destination tasks to a new function that cross-references the predecessor:

```diff
 // In handleDragEnd, replace:
-const filteredDestTasks = filteredTaskDays[destDate] || [];
-const predecessorTaskId = calculatePredecessor(destination, source, filteredDestTasks);
+// Pass filtered list for index mapping, but resolve predecessor ID against unfiltered list
+const filteredDestTasks = filteredTaskDays[destDate] || [];
+const unfilteredDestTasks = taskManagement.taskDays[destDate] || [];
+const predecessorTaskId = calculatePredecessorUnfiltered(
+    destination, source, filteredDestTasks, unfilteredDestTasks
+);
```

In `dragUtils.js`, add the new function:

```javascript
/**
 * Same as calculatePredecessor but resolves the predecessor ID
 * against the unfiltered list to handle project filters correctly.
 *
 * @param {Object} destination
 * @param {Object} source
 * @param {Array} filteredDestTasks - tasks visible in the UI (filtered)
 * @param {Array} unfilteredDestTasks - all tasks for the date (unfiltered)
 * @returns {string|null}
 */
export function calculatePredecessorUnfiltered(destination, source, filteredDestTasks, unfilteredDestTasks) {
    // Get the predecessor task from the filtered view (index-based)
    const filteredPredecessorId = calculatePredecessor(destination, source, filteredDestTasks);

    if (!filteredPredecessorId) return null;

    // The ID is valid in both filtered and unfiltered lists — return it directly.
    // moveTask searches by ID in the unfiltered list, so no further mapping needed.
    return filteredPredecessorId;
}
```

> With filters OFF, `filteredDestTasks === unfilteredDestTasks` so this is a no-op. With filters ON, the predecessor ID is still resolved by `.id` in `moveTask`, which gives the correct insertion point.

Also update the import in `TaskContext.js`:
```diff
-import { calculatePredecessor } from '../lib/dragUtils';
+import { calculatePredecessorUnfiltered } from '../lib/dragUtils';
```

---

## Verification Plan

### Test 1 — 304 cache bust (Step 1)

1. Open browser DevTools → Network tab
2. Filter by `allbydate`
3. Load the app
4. Perform any drag or task update
5. Refresh the page
6. **Expected**: the `allbydate` request now shows `200` (not `304`) on every refresh, and the task list reflects the latest state

### Test 2 — Snapshot serves correct data on refresh (Steps 2 & 3)

1. Drag a task to a different day
2. Immediately refresh (before backend has time to process — or throttle network to Slow 3G)
3. **Expected**: The task appears in the destination day immediately (served from snapshot), even before the backend fetch completes
4. After the backend fetch completes, the task should still be in the correct position
5. Confirm `todo-task-snapshot` key in `localStorage` (Application → Local Storage in DevTools) is updated after every drag

### Test 3 — Creation survives backend failure (Step 4)

1. Stop the Spring Boot backend (or block the port)
2. Create a new task
3. **Expected**: Console shows "queuing CREATE_TASK pending change", task appears in UI
4. Refresh the page
5. **Expected**: Task still appears (added from pending change in applyPendingChanges), even though backend is down
6. Start the backend again — on next interaction/refresh, task order reconciles

### Test 4 — Deletion survives backend failure (Step 5)

1. Stop the Spring Boot backend
2. Delete a task
3. Refresh
4. **Expected**: Task does NOT reappear (DELETE_TASK pending change in applyPendingChanges removes it)

### Test 5 — Same-day reorder fix (Step 6)

1. Enable a project filter to show only one project
2. Drag a task up/down within the same day
3. Refresh
4. **Expected**: Task stays at the reordered position

### Automated Tests

Run existing Jest tests to check for regressions:

```bash
cd /home/agent/projects/myToDo/frontend-next
npm test -- --watchAll=false
```

Check `__tests__/` for existing test coverage. If any test imports from `dragUtils.js` or `pendingChanges.js`, update the import to include the new exports.

---

## Change Complexity Rating

| Change | Risk | Notes |
|---|---|---|
| Step 1 — cache-bust GET | Low | One-line param addition |
| Step 2 — snapshot functions | Low | Additive only, no existing logic changed |
| Step 3 — load snapshot on startup | Medium | New useEffect logic; initial render may flicker between snapshot and fetched data |
| Step 4 — CREATE_TASK pending | Medium | Temp IDs need care; the local task won't be in DB |
| Step 5 — DELETE_TASK pending | Low | Additive pending change, existing delete logic unchanged |
| Step 6 — predecessor fix | Low | Additive function; no behaviour change when filter is off |

> **Recommended order of execution**: Steps 1 → 3 → 2 → 5 → 4 → 6 (highest impact first)
