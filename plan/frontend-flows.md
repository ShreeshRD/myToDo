# Frontend Flows Inventory

This document maps the user-facing pages, views, and components in the Next.js frontend (`frontend-next`) to their main user tasks, state hooks, contexts, and backend API endpoints.

---

## 1. Application Layout & Pages

* **Entry Point Page**: [page.tsx](file:///home/arch/programs/personal_organization/todo/frontend-next/app/page.tsx)
  * Simply mounts the [MainView](file:///home/arch/programs/personal_organization/todo/frontend-next/components/MainView.js) component.
* **Layout**: [layout.tsx](file:///home/arch/programs/personal_organization/todo/frontend-next/app/layout.tsx)
  * Sets up standard HTML shell, metadata, and imports Google Font (Inter).
* **Providers**: [providers.tsx](file:///home/arch/programs/personal_organization/todo/frontend-next/app/providers.tsx)
  * Wraps children with context providers: `UIProvider`, `TaskProvider`, and `StopwatchProvider`.

---

## 2. Core Layout & Routing Structure

### Main View ([MainView.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/MainView.js))
* **User Tasks**: 
  * Controls page switching / sidebar view routing via the `viewPage` state.
  * Manages project tags/categories list, stored in localStorage (`todo-projects`).
  * Adds new project tags.
  * Deletes project tags, optionally deleting all associated tasks (calls `deleteTasksByCategory` / `clearCategoryForTasks` from `TaskContext`).
* **Components Mounted**:
  * [Sidebar](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Sidebar.js)
  * [Header](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Header.js)
  * Views based on `viewPage` state:
    * `Upcoming`: [Upcoming](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Upcoming.js)
    * `Today`: [TodayView](file:///home/arch/programs/personal_organization/todo/frontend-next/components/TodayView.js)
    * `Calendar`: [CalendarView](file:///home/arch/programs/personal_organization/todo/frontend-next/components/CalendarView.js)
    * `Search`: [Search](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Search.js)
    * `Scratchpad`: [Scratchpad (Index)](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Scratchpad/index.js)
  * [CreateTaskPopup](file:///home/arch/programs/personal_organization/todo/frontend-next/components/CreateTaskPopup.js) (when task creation/editing modal is active).

---

## 3. Page Views & Flows

### Upcoming View (`viewPage === 'Upcoming'`)
* **File**: [Upcoming.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Upcoming.js)
* **User Tasks**: View upcoming tasks grouped day-by-day.
* **Component Flow**:
  * Renders a row of [ToDoDay](file:///home/arch/programs/personal_organization/todo/frontend-next/components/ToDoDay.js) panels representing a rolling set of days.
  * Drag-and-drop support (via `@hello-pangea/dnd`) is coordinated by `handleDragEnd` in `TaskContext` to allow tasks to be reordered or moved across days.
* **Backend API Called**:
  * Indirectly triggers `getTasks("bydate")` on mount to load initial data.
  * Triggers `updateField(id, "taskDate", destDate)` and `updateField(t.id, "dayOrder", i + 1)` when tasks are reordered or moved.

### Today View (`viewPage === 'Today'`)
* **File**: [TodayView.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/TodayView.js)
* **User Tasks**: Focus on tasks scheduled for today, track execution time, manage task lists.
* **Component Flow**:
  * Displays today's task list, sorted by `dayOrder`.
  * Integrates the [StopwatchPanel](file:///home/arch/programs/personal_organization/todo/frontend-next/components/StopwatchPanel.js) to track elapsed time on the active task.
  * Integrates [TaskDetailPanel](file:///home/arch/programs/personal_organization/todo/frontend-next/components/TaskDetailPanel.js) to edit task properties.
* **Backend API Called**:
  * On completion toggle: `updateField(id, "complete", boolean)`.
  * On stopwatch tracking updates: `updateField(id, "timeTaken", seconds)` and `updateField(id, "inProgress", boolean)`.

### Calendar View (`viewPage === 'Calendar'`)
* **File**: [CalendarView.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/CalendarView.js)
* **User Tasks**: View complete and incomplete tasks across a wider calendar month.
* **Component Flow**:
  * Renders monthly grid cells. Displays completed task lists under each day cell.
* **Backend API Called**:
  * Operates on task data loaded by `fetchTasks()`.

### Search View (`viewPage === 'Search'`)
* **File**: [Search.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Search.js)
* **User Tasks**: Search, filter, and mass edit tasks.
* **Component Flow**:
  * Provides search filters (query, category, priority, status).
  * Displays match list with batch operation checkboxes.
* **Backend API Called**:
  * Deletions: `deleteTask(taskId)`.
  * Status updates (complete/incomplete/priority): `updateField(id, field, value)`.

### Scratchpad View (`viewPage === 'Scratchpad'`)
* **File**: [Scratchpad/index.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Scratchpad/index.js)
* **User Tasks**: Notion-like block editor for free-form journaling, structured task mapping, and notes.
* **Component Flow**:
  * Loads blocks from [useScratchpadData.js](file:///home/arch/programs/personal_organization/todo/frontend-next/components/Scratchpad/hooks/useScratchpadData.js).
  * Handles block modifications, conversions, deletions, and slash commands.
* **Backend API Called**:
  * Reads on load: `getScratchpad()`.
  * Saves dynamically with a 1-second debounce: `saveScratchpad(JSON.stringify(blocks))`.

---

## 4. Key Utility & State Layers

### Task Context (`TaskContext.js` / `useTaskManagement.js`)
Handles client-side task cache synchronization and updates the backend when UI mutations occur.
* **`fetchTasks()`**: Invokes `getTasks("bydate")` (`GET /todo/allbydate`) to populate `taskDays`, `completedTasks`, and `overdueTasks`.
* **`updateTask(id, field, value, date)`**: Optimistically updates frontend state, then calls `updateField(id, field, value)` (`POST /todo/update`).
  * If a repeating task is marked complete, triggers `addNextRepeat()` which computes the next recurrence and calls `addTask` (`POST /todo/add`).
* **`removeTask(taskId, date)`**: Optimistically removes the task, then calls `deleteTask(taskId)` (`DELETE /todo/delete/{id}`).
* **`moveTask(taskId, destDate, predecessorTaskId)`**: Performs the drag-and-drop calculation, updates `dayOrder` sequences, and executes backend calls to update `taskDate` and `dayOrder` for affected tasks.
