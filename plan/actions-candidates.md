# Agent-Native Candidate Actions

This document identifies candidate Agent-Native Actions that will wrap the backend REST endpoints and frontend flows. These will be exposed to the agent runtime via the `defineAction` API.

---

## Task Operations

### 1. `list_tasks`
* **Purpose**: Retrieve all tasks, optionally grouped or filtered by date, category, completion status, or priority.
* **Input Schema (Zod)**:
  ```ts
  z.object({
    groupByDate: z.boolean().optional().default(true),
    category: z.string().optional(),
    complete: z.boolean().optional(),
    priority: z.number().min(0).max(4).optional(),
  })
  ```
* **Output Schema**:
  ```ts
  z.object({
    tasks: z.array(z.object({
      id: z.number(),
      name: z.string(),
      category: z.string(),
      taskDate: z.string(), // YYYY-MM-DD
      complete: z.boolean(),
      priority: z.number(),
      dayOrder: z.number(),
      assignedTime: z.string().nullable(), // HH:mm:ss
      inProgress: z.boolean(),
      longTerm: z.boolean(),
      timeTaken: z.number().nullable(),
    }))
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `GET /todo/allbydate` or `GET /todo/all`.

---

### 2. `create_task`
* **Purpose**: Create a new task on a specific date.
* **Input Schema (Zod)**:
  ```ts
  z.object({
    name: z.string().min(1, "Task name cannot be empty"),
    taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
    category: z.string().optional().default("None"),
    priority: z.number().min(0).max(4).optional().default(0),
    repeatType: z.enum(["NONE", "EVERY_X_DAYS", "EVERY_X_WEEKS", "EVERY_X_MONTHS", "SPECIFIC_WEEKDAYS"]).optional().default("NONE"),
    repeatDuration: z.number().int().nonnegative().optional().default(0),
    longTerm: z.boolean().optional().default(false),
  })
  ```
* **Output Schema**:
  ```ts
  z.object({
    success: z.boolean(),
    message: z.string(),
    task: z.object({
      id: z.number(),
      name: z.string(),
      category: z.string(),
      taskDate: z.string(),
      complete: z.boolean(),
      priority: z.number(),
      dayOrder: z.number(),
    })
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `POST /todo/add`.

---

### 3. `update_task`
* **Purpose**: Update one or more fields of an existing task.
* **Input Schema (Zod)**:
  ```ts
  z.object({
    id: z.number().int().positive(),
    field: z.enum([
      "taskName", "category", "taskDate", "dayOrder", "complete",
      "priority", "repeatType", "repeatDuration", "assignedTime",
      "inProgress", "longTerm", "timeTaken"
    ]),
    value: z.string(),
  })
  ```
* **Output Schema**:
  ```ts
  z.object({
    success: z.boolean(),
    message: z.string(),
    task: z.object({
      id: z.number(),
      name: z.string(),
      category: z.string(),
      taskDate: z.string(),
      complete: z.boolean(),
      priority: z.number(),
      dayOrder: z.number(),
      assignedTime: z.string().nullable(),
      inProgress: z.boolean(),
      timeTaken: z.number().nullable(),
    }).nullable()
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `POST /todo/update`.

---

### 4. `delete_task`
* **Purpose**: Remove a task from the system.
* **Input Schema (Zod)**:
  ```ts
  z.object({
    id: z.number().int().positive(),
  })
  ```
* **Output Schema**:
  ```ts
  z.object({
    success: z.boolean(),
    message: z.string(),
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `DELETE /todo/delete/{id}`.

---

## Scratchpad Operations

### 5. `get_scratchpad`
* **Purpose**: Retrieve the active scratchpad document/notes.
* **Input Schema (Zod)**:
  ```ts
  z.object({})
  ```
* **Output Schema**:
  ```ts
  z.object({
    id: z.number(),
    content: z.string(), // Stringified JSON blocks
    lastModified: z.string(),
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `GET /todo/scratchpad`.

---

### 6. `save_scratchpad`
* **Purpose**: Update the scratchpad document/notes content.
* **Input Schema (Zod)**:
  ```ts
  z.object({
    content: z.string(), // Stringified JSON blocks
  })
  ```
* **Output Schema**:
  ```ts
  z.object({
    success: z.boolean(),
    scratchpad: z.object({
      id: z.number(),
      content: z.string(),
      lastModified: z.string(),
    })
  })
  ```
* **Required Permissions**: Authenticated User (Owner)
* **Backend Mapping**: Map to `POST /todo/scratchpad`.
