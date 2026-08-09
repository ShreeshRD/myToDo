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
* **Response Type**: [TodoOperationResult.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/dto/TodoOperationResult.java)
  * Fields: `status` ("Added"), `item` (`TodoItem`)
* **Side Effects**: Writes to DB (inserts a new `TodoItem` row).

#### `POST /todo/update`
* **Method**: `updateItem(...)`
* **Description**: Updates a single field on an existing task by ID.
* **Request Parameters**:
  * `id` (long, required)
  * `field` (String, required, valid values: `taskName`, `category`, `taskDate`, `dayOrder`, `complete`, `priority`, `repeatType`, `repeatDuration`, `assignedTime`, `inProgress`, `longTerm`, `timeTaken`)
  * `value` (String, required, parsed depending on the field type)
* **Response Type**: [TodoOperationResult.java](file:///home/arch/programs/personal_organization/todo/backend-springboot/src/main/java/com/myapp/todo/dto/TodoOperationResult.java)
  * Fields: `status` ("Updated" or "Error: <message>"), `item` (`TodoItem` or `null`)
* **Side Effects**: Writes to DB (updates task fields). 
  * *Note*: Marking as complete (`complete=true`) automatically sets `assignedTime` to the current local time in `Asia/Kolkata` time zone.

#### `DELETE /todo/delete/{id}`
* **Method**: `delete(@PathVariable Long id)`
* **Description**: Deletes a task by ID.
* **Request Parameters**: Path variable `id` (Long).
* **Response Type**: `boolean` (Returns `true` if the deleted task was complete, `false` otherwise).
* **Side Effects**: Writes to DB (deletes the `TodoItem` row).

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
