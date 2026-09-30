# Backend Endpoints Inventory

This document inventory details all REST API controllers and endpoints available in the Spring Boot backend (`backend-springboot`), listing their paths, HTTP methods, parameters, return types, and side effects.

---

## 1. Todo REST Controller (`TodoRestController`)

- **Class**: [TodoRestController.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/TodoRestController.java)
- **Base Path**: `/todo`

### Endpoints

#### `GET /todo/all`
* **Method**: `getAll()`
* **Description**: Retrieve all todo items in flat format.
* **Request Parameters**: None.
* **Response Type**: `Iterable<TodoItem>`
* **Domain Model**: [TodoItem.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/TodoItem.java)
* **Side Effects**: Read-only (database query).

#### `GET /todo/allbydate`
* **Method**: `getAllByDate()`
* **Description**: Retrieve all todo items grouped and sorted by their task dates.
* **Request Parameters**: None.
* **Response Type**: `GroupedTodoItems`
  * Contains a map `itemsByDate` where key is date string `yyyy-MM-dd` and value is `List<TodoItem>` sorted by `dayOrder`.
* **Domain Model**: [GroupedTodoItems.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/GroupedTodoItems.java)
* **Side Effects**: Read-only (database query and grouping).

#### `POST /todo/add`
* **Method**: `addItem(...)`
* **Description**: Adds a new task to the database, auto-assigning the next `dayOrder` for that date.
* **Request Parameters** (Multipart/Form URL-encoded or Query Parameters):
  * `category` (String, required)
  * `name` (String, required)
  * `taskDate` (LocalDate, required, `yyyy-MM-dd` format)
  * `repeatType` (TodoItem.RepeatPattern enum, optional, defaults to `NONE`)
  * `repeatDuration` (Integer, optional, defaults to `0`)
  * `priority` (Integer, optional, defaults to `0`)
  * `longTerm` (Boolean, optional, defaults to `false`)
  * `assignedTime` (LocalTime, optional, `HH:mm[:ss]`)
  * `reminderMinutesBefore` (Integer, optional; null = no reminder)
* **Response Type**: [TodoOperationResult.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/dto/TodoOperationResult.java)
  * Fields: `status` ("Added"), `item` (`TodoItem`)
* **Side Effects**: Writes to DB (inserts a new `TodoItem` row).

#### `POST /todo/edit`
* **Method**: `editItem(...)`
* **Description**: Replaces a task's editable fields in place (used by the web task dialog). The task keeps its `id` and `uuid`, so sync clients receive an edit rather than a tombstone plus a new task.
* **Request Parameters**: `id` (long, required) plus the same parameters as `/todo/add`; optional ones fall back to the same defaults, and an omitted `assignedTime`/`reminderMinutesBefore` clears it.
* **Response Type**: [TodoOperationResult.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/dto/TodoOperationResult.java)
  * Fields: `status` ("Updated" or "Error: Item not found"), `item` (`TodoItem` or `null`)
* **Side Effects**: Writes to DB and bumps `updatedAt`. `complete`, `inProgress` and `timeTaken` are untouched. Moving the task to another date puts it last on that date; otherwise `dayOrder` is kept.

#### `POST /todo/update`
* **Method**: `updateItem(...)`
* **Description**: Updates a single field on an existing task by ID.
* **Request Parameters**:
  * `id` (long, required)
  * `field` (String, required, valid values: `taskName`, `category`, `taskDate`, `dayOrder`, `complete`, `priority`, `repeatType`, `repeatDuration`, `assignedTime`, `inProgress`, `longTerm`, `timeTaken`, `reminderMinutesBefore`; `"null"` clears `assignedTime`/`reminderMinutesBefore`)
  * `value` (String, required, parsed depending on the field type)
* **Response Type**: [TodoOperationResult.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/dto/TodoOperationResult.java)
  * Fields: `status` ("Updated" or "Error: <message>"), `item` (`TodoItem` or `null`), `nextItem` (the next occurrence created when a recurring task was completed, else `null`)
* **Side Effects**: Writes to DB (updates task fields). 
  * *Note*: Marking as complete (`complete=true`) automatically sets `assignedTime` to the current local time in `Asia/Kolkata` time zone.
  * *Note*: Completing a recurring task (false → true) creates the next occurrence (same name, project, priority, repeat, scheduled time and reminder) unless a task with the same name + project already exists on that date. SPECIFIC_WEEKDAYS masks use bit 64 = Monday … bit 1 = Sunday.

#### `DELETE /todo/delete/{id}`
* **Method**: `delete(@PathVariable Long id)`
* **Description**: Deletes a task by ID.
* **Request Parameters**: Path variable `id` (Long).
* **Response Type**: `boolean` (Returns `true` if the deleted task was complete, `false` otherwise).
* **Side Effects**: Soft delete: sets `deleted=true` and bumps `updatedAt` so sync clients receive a tombstone. Deleted tasks are hidden from `/all`, `/allbydate` and `/update`.

---

## 2. Scratchpad Controller (`ScratchpadController`)

- **Class**: [ScratchpadController.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/ScratchpadController.java)
- **Base Path**: `/todo/scratchpad`

### Endpoints

#### `GET /todo/scratchpad`
* **Method**: `getScratchpad()`
* **Description**: Retrieves the most recent scratchpad content.
* **Request Parameters**: None.
* **Response Type**: [Scratchpad.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/Scratchpad.java)
  * Fields: `id` (Long), `content` (TEXT, typically holding block array JSON), `lastModified` (LocalDateTime).
* **Side Effects**: Read-only.

#### `POST /todo/scratchpad`
* **Method**: `saveScratchpad(@RequestBody String content)`
* **Description**: Saves the scratchpad content block array as a raw text body.
* **Request Body**: `String` (content type `text/plain`, containing the stringified JSON representation of scratchpad blocks).
* **Response Type**: [Scratchpad.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/Scratchpad.java)
* **Side Effects**: Writes to DB (updates or inserts the last scratchpad record with the current timestamp).

---

## 3. Sync Controller (`SyncController`)

- **Class**: `backend-springboot/src/main/java/com/myapp/todo/SyncController.java` (logic in `SyncService.java`)
- **Base Path**: `/todo/sync`
- **Purpose**: Offline-first clients (the Android app). Tasks are keyed by `uuid`; conflicts resolve per task by last write wins on `updatedAt` (epoch ms).

#### `GET /todo/sync/changes?since=<epochMs>`
* **Response**: `SyncResponse` `{ serverTime, items: TodoItem[] }` — every task (including `deleted=true` tombstones) with `updatedAt > since`. Clients store `serverTime` and send it as the next `since`.
* **Side Effects**: Read-only.

#### `POST /todo/sync/push`
* **Request Body** (JSON): `SyncPushRequest` `{ items: TodoItem[] }` — full snapshots with `uuid` and client `updatedAt`; `id` is ignored.
* **Behaviour**: unknown `uuid` → inserted (server assigns `id`, and `dayOrder` if missing); known `uuid` → applied only when the incoming `updatedAt` is newer. Completing a recurring task creates its next occurrence exactly as `/todo/update` does.
* **Response**: `SyncResponse` — the stored version of each pushed task, followed by any next occurrences created.

