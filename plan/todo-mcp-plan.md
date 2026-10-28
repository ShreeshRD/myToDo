---
title: Todo MCP Server and Backend Query API
status: ready-for-implementation
created: 2026-10-28
scope: backend-springboot query endpoints + new mcp/ Node server
---

# Todo MCP Server and Backend Query API

## 1. Goal

Add a lightweight HTTP MCP server that lets the local Qwen model read and manage tasks in this todo app. The model must be able to:

- Fetch today's tasks, including overdue open tasks.
- Fetch the current week's tasks (Monday–Sunday).
- Count matching tasks without receiving the full task list.
- Find the latest or oldest matching task, especially a recurring task by exact name.
- Create tasks on any date today or later.
- Update tasks, complete/uncomplete tasks, and delete tasks.
- Continue a recurring task chain when a recurring task is completed through MCP.
- List projects (the backend `category` field) with task counts.

The MCP server is a thin bridge. It must not access SQLite directly. All task data goes through the existing Spring Boot REST API, extended with four query endpoints.

The model is small and has a 40k context. Every tool description must stay short, every list response is capped, and count/search tools must never return a full task list.

## 2. Locked decisions

| Decision | Value |
|---|---|
| MCP transport | Stateless Streamable HTTP |
| MCP bind address | `127.0.0.1:8765`, endpoint `/mcp` |
| MCP auth | None; localhost only |
| MCP CORS | Allow `http://localhost:*` and `http://127.0.0.1:*` |
| MCP runtime | Node 24, ESM JavaScript, no build step |
| MCP dependencies | `@modelcontextprotocol/sdk@1.32.2`, `express@5.3.0`, `zod@4.6.7`, `dayjs@1.11.23`, `cors@2.8.5` |
| MCP tests | Node built-in `node:test`, no running Spring Boot required |
| Default backend | Dev: `http://127.0.0.1:8000` (`TODO_API_URL`) |
| Prod backend | `http://127.0.0.1:5555` via env override |
| Timezone | `Asia/Kolkata` (IST), pinned |
| Week definition | Monday 00:00 through Sunday 23:59, inclusive |
| Day view | Requested date's tasks; when date is today, also open tasks before today |
| Week view | Monday–Sunday only; no overdue section |
| Task list cap | 50 items per list; set a `truncated` flag |
| Search text | `query` = case-insensitive name substring; `project` = case-insensitive exact; `exact_name` = case-insensitive exact |
| Count output | `{count, open, completed}` plus echoed filters |
| Find order | By `taskDate`, tie-break by `id`; `latest` = greatest, `oldest` = smallest |
| Create date | `YYYY-MM-DD`, today or later |
| Update scope | Any task; date changes must be today or later |
| Delete safety | Requires `id` **and** exact task name (case-insensitive, trimmed) |
| Completion | Dedicated `complete_task` / `uncomplete_task`; `update_task` cannot change completion |
| Recurrence | On open→complete only; create next instance; skip duplicates with warning |
| Recurring creation | Not exposed; `create_task` creates non-recurring tasks only |
| Projects | Distinct backend `category` values with total task counts |
| Output format | One compact JSON text block per tool result |

## 3. Current system facts

These facts are why the plan is shaped this way. Do not re-discover them.

- Backend dev port is `8000` (`backend-springboot/src/main/resources/application.properties:10`).
- Backend prod port is `5555` (`backend-springboot/src/main/resources/application-prod.properties`).
- Existing controller endpoints (`backend-springboot/src/main/java/com/myapp/todo/TodoRestController.java:19-53`):
  - `GET /todo/all`
  - `GET /todo/allbydate`
  - `POST /todo/add` with `category`, `name`, `taskDate`, optional `repeatType`, `repeatDuration`, `priority`, `longTerm`
  - `POST /todo/update` with `id`, `field`, `value`
  - `DELETE /todo/delete/{id}`
- There are no filtered query endpoints.
- `DELETE /todo/delete/{id}` returns `item.isComplete()`, not success (`TodoService.java:135-146`). A successful delete of an incomplete task returns `false`. The MCP must never interpret this boolean as success; verify deletion by re-fetching the item.
- `POST /todo/update` returns HTTP 200 even for logical errors. The body is `{status: "Error: ...", item: null}` (`TodoService.java:70-133`). The MCP must inspect `status`.
- `update` field names are `taskName`, `taskDate`, `category`, `priority`, `complete`, `inProgress`, `longTerm`, `assignedTime`, `timeTaken`, `dayOrder` (`TodoService.java:79-120`). They are not the JSON field names.
- Completing a task sets `assignedTime` to the current time in `Asia/Kolkata` (`TodoService.java:92-99`). Uncompleting does **not** clear it.
- Recurring next instances are created only in the frontend (`frontend-next/hooks/useTaskManagement.js:261-330`). The backend has no recurrence scheduler.
- `repeatDuration` is a weekday bitmask when `repeatType` is `SPECIFIC_WEEKDAYS` (`useTaskManagement.js:292-302`). Bit index 0 is Monday, index 6 is Sunday.
- The frontend's duplicate check for the next instance is same name + same category on the next date (`useTaskManagement.js:309-320`).
- `/todo/all` is small in practice: 519 rows in prod, 9 rows in dev. Server-side in-memory filtering in the service is acceptable for v1.
- The UI calls the backend `category` field "project". The sidebar project list is also stored in browser localStorage (`todo-projects`), so projects with zero tasks cannot be seen by the MCP.
- The app's search UI currently matches task name only (`frontend-next/components/Search.js`), with filters for Completed/Active/Recurring/Project.
- The existing backend tests use H2 with the `test` profile (`backend-springboot/src/test/resources/application-test.properties`).

## 4. Architecture

```
Web UI / custom MCP client
        |
        | Streamable HTTP (JSON-RPC), 127.0.0.1:8765/mcp
        v
todo-mcp (Node ESM)
  - date/week math (Asia/Kolkata)
  - tool schemas and compact JSON
  - recurrence next-instance logic
        |
        | HTTP/JSON, TODO_API_URL (default 127.0.0.1:8000)
        v
Spring Boot todo API
  - /todo/query, /todo/count, /todo/item/{id}, /todo/projects
  - existing /todo/add, /todo/update, /todo/delete/{id}
        |
        v
SQLite (todo-dev.db or todo.db)
```

Rules:

- The MCP server must not import SQLite drivers or read `.db` files.
- The MCP server must not call `/todo/all` for queries. Use the new endpoints.
- The MCP server must not write to prod unless `TODO_API_URL` explicitly points to `http://127.0.0.1:5555`.
- The MCP server is stateless: each HTTP POST creates a fresh `McpServer` and `StreamableHTTPServerTransport`. Do not share transports between requests.

## 5. Backend changes (Spring Boot)

All backend changes are additive. Do not change existing endpoint behavior or existing tests.

### 5.1 New DTOs

Create these in `backend-springboot/src/main/java/com/myapp/todo/dto/`.

#### `TaskQuery.java`

A query-parameter binding object for `@ModelAttribute`. Use Lombok `@Getter @Setter` and a no-arg constructor.

```java
package com.myapp.todo.dto;

import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class TaskQuery {
    private String q;
    private String exactName;
    private String project;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate start;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate end;
    private String status = "all";   // all | open | completed
    private Boolean recurring;       // null = no filter
    private String order = "asc";    // asc | desc
    private Integer limit = 100;     // clamped 1..500
}
```

#### `TaskCounts.java`

```java
package com.myapp.todo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskCounts {
    private long count;
    private long open;
    private long completed;

    public TaskCounts() {
    }

    public TaskCounts(long count, long open, long completed) {
        this.count = count;
        this.open = open;
        this.completed = completed;
    }
}
```

#### `ProjectCount.java`

```java
package com.myapp.todo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCount {
    private String name;
    private long count;

    public ProjectCount() {
    }

    public ProjectCount(String name, long count) {
        this.name = name;
        this.count = count;
    }
}
```

### 5.2 Service methods

Add to `backend-springboot/src/main/java/com/myapp/todo/TodoService.java`. Keep all existing methods unchanged.

Required public methods:

```java
public List<TodoItem> queryTasks(TaskQuery query)
public TaskCounts countTasks(TaskQuery query)
public Optional<TodoItem> getTask(long id)
public List<ProjectCount> getProjectCounts()
```

Required private helpers:

```java
private Stream<TodoItem> filterTasks(TaskQuery query)
private void validateQuery(TaskQuery query)
private String normalizeStatus(String status)
private String normalizeOrder(String order)
private int normalizeLimit(Integer limit)
private String projectName(TodoItem item)
private boolean isRecurring(TodoItem item)
private boolean containsIgnoreCase(String value, String needle)
private boolean equalsIgnoreCase(String left, String right)
```

Filtering rules:

- Start from `StreamSupport.stream(repository.findAll().spliterator(), false)`.
- `q`: case-insensitive substring match on `name`. Trim the input; blank means no filter.
- `exactName`: case-insensitive exact match on `name`. Trim; blank means no filter.
- `project`: case-insensitive exact match on `projectName(item)`. Trim; blank means no filter.
- `projectName(item)`: `category` is null or blank → `"None"`; otherwise the trimmed category.
- `start` / `end`: inclusive `taskDate` bounds.
- `status`:
  - `all` → no filter
  - `open` → `!item.isComplete()`
  - `completed` → `item.isComplete()`
- `recurring`:
  - `true` → `repeatType != null && repeatType != NONE`
  - `false` → `repeatType == null || repeatType == NONE`
  - `null` → no filter
- All filters compose with AND.

Validation rules:

- `status` is case-insensitive. Blank/null becomes `all`. It must be `all`, `open`, or `completed`. Otherwise throw `ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be all, open, or completed")`.
- `order` is case-insensitive. Blank/null becomes `asc`. It must be `asc` or `desc`. Otherwise throw `ResponseStatusException(HttpStatus.BAD_REQUEST, "order must be asc or desc")`.
- If both `start` and `end` are present and `start.isAfter(end)`, throw `ResponseStatusException(HttpStatus.BAD_REQUEST, "start must be on or before end")`.
- `limit`: null → 100; less than 1 → 1; greater than 500 → 500.
- Blank strings for `q`, `exactName`, `project` become `null`.

Sorting and limiting:

- Sort by `taskDate`, then `id`.
- `order=asc`: ascending `taskDate`, ascending `id`.
- `order=desc`: descending `taskDate`, descending `id`.
- Apply `limit` after sorting.
- `countTasks` ignores `order` and `limit`; it counts all filtered tasks.
- `countTasks` computes `count = filtered.size()`, `completed = filtered.stream().filter(TodoItem::isComplete).count()`, `open = count - completed`.
- `getProjectCounts` groups all tasks by `projectName`, counts total tasks per project, sorts by count descending then name ascending, and includes `"None"`.

Performance note: v1 intentionally fetches all rows and filters in memory. The dataset is ~519 rows. Add a comment in the service that this is acceptable until the dataset grows beyond roughly 10k tasks.

### 5.3 Controller endpoints

Add to `backend-springboot/src/main/java/com/myapp/todo/TodoRestController.java`. Keep existing methods unchanged.

```java
@GetMapping("/query")
public @ResponseBody List<TodoItem> query(@ModelAttribute TaskQuery query) {
    return todoService.queryTasks(query);
}

@GetMapping("/count")
public @ResponseBody TaskCounts count(@ModelAttribute TaskQuery query) {
    return todoService.countTasks(query);
}

@GetMapping("/item/{id}")
public ResponseEntity<TodoItem> getItem(@PathVariable Long id) {
    return todoService.getTask(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
}

@GetMapping("/projects")
public @ResponseBody List<ProjectCount> projects() {
    return todoService.getProjectCounts();
}
```

Required imports: `com.myapp.todo.dto.TaskCounts`, `com.myapp.todo.dto.TaskQuery`, `com.myapp.todo.dto.ProjectCount`, `java.util.List`, `org.springframework.http.ResponseEntity`.

`TodoService` also needs `java.util.stream.Stream`, `org.springframework.http.HttpStatus`, and `org.springframework.web.server.ResponseStatusException`.

Use `/item/{id}` rather than `/{id}` to avoid ambiguity with `/all`, `/add`, `/update`.

### 5.4 Endpoint contract examples

#### `GET /todo/query`

All parameters optional except none; defaults are `status=all`, `order=asc`, `limit=100`.

```
GET /todo/query?q=photo&project=Personal&start=2026-10-01&end=2026-10-31&status=open&order=desc&limit=1
```

Response is a JSON array of full `TodoItem` objects, exactly like `/todo/all`:

```json
[
  {
    "taskDate": "2026-10-28",
    "dayOrder": 1,
    "id": 7358,
    "category": "Personal",
    "name": "Take daily photo",
    "complete": false,
    "repeatType": "EVERY_X_DAYS",
    "repeatDuration": 1,
    "priority": 0,
    "inProgress": false,
    "longTerm": false,
    "assignedTime": null,
    "timeTaken": null
  }
]
```

#### `GET /todo/count`

Same filter parameters as `/query`. `order` and `limit` are accepted but ignored.

```json
{"count":12,"open":5,"completed":7}
```

#### `GET /todo/item/{id}`

- `200` with a full `TodoItem`.
- `404` with no body when the id does not exist.

#### `GET /todo/projects`

```json
[
  {"name":"None","count":445},
  {"name":"Personal","count":71},
  {"name":"Memories","count":2},
  {"name":"Office","count":1}
]
```

### 5.5 Backend tests

Create `backend-springboot/src/test/java/com/myapp/todo/TodoQueryIntegrationTest.java`.

Use:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class TodoQueryIntegrationTest { ... }
```

In `@BeforeEach`, call `repository.deleteAll()`.

Helper:

```java
private TodoItem saveTask(String name, String category, LocalDate date,
                          boolean complete, TodoItem.RepeatPattern repeat, int duration) {
    TodoItem item = new TodoItem(date, 1, category, name);
    item.setComplete(complete);
    item.setRepeatType(repeat);
    item.setRepeatDuration(duration);
    item.setPriority(0);
    item.setLongTerm(false);
    return repository.save(item);
}
```

Required test cases (all must pass):

| # | Test name | Arrange | Request | Expected |
|---|---|---|---|---|
| 1 | `querySubstringCaseInsensitive` | "Take daily photo", "Buy milk" | `/todo/query?q=PHOTO` | 1 item, name "Take daily photo" |
| 2 | `queryExactName` | "Take daily photo", "Take daily photo 2" | `/todo/query?exactName=Take daily photo` | 1 item, exact name |
| 3 | `queryProjectExactCaseInsensitive` | Personal, Office | `/todo/query?project=personal` | 1 Personal item; `project=Pers` → 0 |
| 4 | `queryDateRangeInclusive` | dates 2026-10-25, 26, 27 | `start=2026-10-26&end=2026-10-27` | 2 items |
| 5 | `queryStatusOpen` | 2 open, 1 complete | `/todo/query?status=open` | 2 items |
| 6 | `queryStatusCompleted` | same | `/todo/query?status=completed` | 1 item |
| 7 | `queryStatusAll` | same | `/todo/query?status=all` | 3 items |
| 8 | `queryRecurringTrue` | NONE, EVERY_X_DAYS | `/todo/query?recurring=true` | 1 item |
| 9 | `queryRecurringFalse` | same | `/todo/query?recurring=false` | 2 items |
| 10 | `queryOrderDescLimit` | dates 26, 27, 28 | `order=desc&limit=1` | date 28 |
| 11 | `queryOrderAscLimit` | same | `order=asc&limit=1` | date 26 |
| 12 | `queryTieBreakIdDesc` | two tasks same date, ids 1 and 2 | `order=desc&limit=1` | id 2 |
| 13 | `queryEmptyResult` | no match | `q=zzzz` | `[]` |
| 14 | `queryInvalidStatus` | — | `status=bogus` | HTTP 400 |
| 15 | `queryStartAfterEnd` | — | `start=2026-10-29&end=2026-10-28` | HTTP 400 |
| 16 | `countReturnsBreakdown` | 2 open, 1 complete | `/todo/count` | `count=3, open=2, completed=1` |
| 17 | `countAppliesFilters` | Personal 2, Office 1 | `/todo/count?project=Personal` | `count=2` |
| 18 | `itemByIdReturnsTask` | one task | `/todo/item/{id}` | 200, matching id |
| 19 | `itemByIdMissingReturns404` | — | `/todo/item/99999` | 404 |
| 20 | `projectsDistinctCounts` | Personal 2, Office 1, None 1 | `/todo/projects` | 3 entries, counts correct, sorted |
| 21 | `limitClampsLow` | 3 tasks | `/todo/query?limit=0` | 1 item |
| 22 | `limitClampsHigh` | 3 tasks | `/todo/query?limit=9999` | 3 items |

Existing tests in `TodoRestControllerIntegrationTest.java` and `TodoServiceTest.java` must still pass.

Run:

```bash
cd backend-springboot
./mvnw test
```

## 6. MCP server

Create a new top-level folder `mcp/`. Do not modify the frontend.

### 6.1 Files

```
mcp/
  package.json
  package-lock.json
  .gitignore
  README.md
  AGENT.md
  src/
    server.js          # env config, TodoApi, app.listen
    app.js             # createApp({api, clock, config}) -> Express app
    mcp.js             # createMcpServer({api, clock, config})
    api.js             # TodoApi HTTP client and ApiError
    config.js          # loadConfig(env)
    dates.js           # todayInZone, weekBounds, ISO validation, addDays
    recurrence.js      # nextOccurrence
    tasks.js           # compactTask, groupWeek, sort helpers, project normalization
    errors.js          # ToolError, ok(), fail()
    tools/
      index.js         # registerReadTools + registerWriteTools
      shared.js        # context(), validation, tool result helpers
      read.js          # getDay, getWeek, countTasks, findTask, listProjects
      write.js         # createTask, updateTask, completeTask, uncompleteTask, deleteTask
  test/
    fixtures.js
    dates.test.js
    recurrence.test.js
    tasks.test.js
    api.test.js
    tools.test.js
    http.test.js
```

### 6.2 `package.json`

Use exact dependency versions. Commit `package-lock.json`.

```json
{
  "name": "todo-mcp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test",
    "test:watch": "node --test --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.32.2",
    "cors": "2.8.5",
    "dayjs": "1.11.23",
    "express": "5.3.0",
    "zod": "4.6.7"
  }
}
```

`.gitignore` in `mcp/`:

```
node_modules/
.env
*.log
```

### 6.3 Configuration

`src/config.js`:

```js
export function loadConfig(env = process.env) {
  return {
    host: env.TODO_MCP_HOST ?? "127.0.0.1",
    port: Number(env.TODO_MCP_PORT ?? 8765),
    path: env.TODO_MCP_PATH ?? "/mcp",
    apiUrl: env.TODO_API_URL ?? "http://127.0.0.1:8000",
    apiTimeoutMs: Number(env.TODO_API_TIMEOUT_MS ?? 5000),
    timeZone: env.TODO_TIMEZONE ?? "Asia/Kolkata",
    maxTasks: Number(env.TODO_MAX_TASKS ?? 50),
  };
}
```

Validate:

- `port` is an integer 1–65535.
- `apiTimeoutMs` is a positive integer.
- `maxTasks` is an integer 1–200.
- `path` starts with `/`.
- `apiUrl` is a valid URL.

Throw a clear error at startup if invalid.

Environment table for README:

| Variable | Default | Meaning |
|---|---|---|
| `TODO_MCP_HOST` | `127.0.0.1` | Bind address |
| `TODO_MCP_PORT` | `8765` | HTTP port |
| `TODO_MCP_PATH` | `/mcp` | MCP endpoint path |
| `TODO_API_URL` | `http://127.0.0.1:8000` | Spring Boot base URL; use `http://127.0.0.1:5555` for prod |
| `TODO_API_TIMEOUT_MS` | `5000` | Backend request timeout |
| `TODO_TIMEZONE` | `Asia/Kolkata` | Date boundary timezone |
| `TODO_MAX_TASKS` | `50` | Per-list response cap |

### 6.4 HTTP transport

`src/app.js` must export:

```js
export function createApp({ api, clock = () => new Date(), config })
```

It returns an Express app with:

- `createMcpExpressApp({ host: config.host })` from `@modelcontextprotocol/sdk/server/express.js`.
- CORS middleware.
- `POST config.path` → stateless MCP request.
- `GET config.path` → `405` JSON-RPC error `"Method not allowed."`
- `DELETE config.path` → `405` JSON-RPC error `"Method not allowed."`
- `GET /health` → `{ok:true, api: config.apiUrl, today: todayInZone(clock(), config.timeZone)}`.

CORS:

```js
const allowedOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin(origin, cb) {
    cb(null, !origin || allowedOrigin.test(origin));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "Mcp-Session-Id",
    "MCP-Protocol-Version",
    "Last-Event-ID"
  ],
  exposedHeaders: ["Mcp-Session-Id"]
}));
```

Do not throw for a disallowed origin; omit the CORS header instead. This keeps browser behavior predictable and avoids 500s.

Stateless POST handler:

```js
app.post(config.path, async (req, res) => {
  const server = createMcpServer({ api, clock, config });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[todo-mcp] request failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  }
});
```

`src/server.js`:

```js
const config = loadConfig();
const api = new TodoApi({ baseUrl: config.apiUrl, timeoutMs: config.apiTimeoutMs });
const app = createApp({ api, clock: () => new Date(), config });
app.listen(config.port, config.host, () => {
  console.error(`[todo-mcp] listening on http://${config.host}:${config.port}${config.path}`);
});
```

Log to stderr, not stdout.

### 6.5 MCP server and tool registration

`src/mcp.js`:

```js
export function createMcpServer({ api, clock, config }) {
  const server = new McpServer(
    { name: "todo-mcp", version: "1.0.0" },
    {
      instructions:
        "Todo MCP. Dates are YYYY-MM-DD in Asia/Kolkata. " +
        "Use get_day/get_week to read, count_tasks for counts, " +
        "find_task for one task, and write tools to change tasks. " +
        "Lists are capped at 50."
    }
  );

  registerTools(server, { api, clock, config });
  return server;
}
```

Use `import * as z from "zod/v4"` for schemas.

### 6.5.1 Handler signature and context

Export each tool handler as a plain async function so it can be unit-tested without the MCP protocol:

```js
export async function getDay(args, ctx) { ... }
```

`ctx` is built once per tool call:

```js
export function makeContext({ api, clock, config }) {
  const today = todayInZone(clock(), config.timeZone);
  return {
    api,
    config,
    today,
    week: weekBounds(today)
  };
}
```

`src/tools/shared.js` exports `runTool(handler, deps)`:

```js
export function runTool(handler, deps) {
  return async (args) => {
    let ctx;
    try {
      ctx = makeContext(deps);
      return await handler(args, ctx);
    } catch (error) {
      const anchors = ctx ? { today: ctx.today, week: ctx.week } : {};
      if (error instanceof ToolError) {
        return fail(error.code, error.message, { ...anchors, ...error.extra });
      }
      if (error instanceof ApiError) {
        return fail(error.code, error.message, anchors);
      }
      console.error("[todo-mcp] unexpected tool error", error);
      return fail("internal_error", "Unexpected error", anchors);
    }
  };
}
```

Registration wraps each handler:

```js
server.registerTool(
  "get_day",
  { title: "Get day tasks", description: "...", inputSchema: { ... } },
  runTool(getDay, { api, clock, config })
);
```

Tests may call `getDay(args, makeContext({...}))` directly and assert the returned tool result, or assert thrown `ToolError`/`ApiError` for lower-level tests. Prefer asserting the `runTool` result for error-code tests.

Tool result helpers in `src/errors.js`:

```js
export function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function fail(code, message, extra = {}) {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: code, message, ...extra }) }],
    isError: true
  };
}
```

Every handler must catch `ApiError` and return `fail(...)`. Never let an exception escape to the MCP SDK.

### 6.6 Tool catalog

Exactly 10 tools. Do not add more in v1.

#### `get_day`

- Description: `Get tasks for a date (default today, Asia/Kolkata). Today also includes overdue open tasks.`
- Input schema:
  - `date`: `z.string().regex(ISO_DATE).optional()` — `YYYY-MM-DD`, default today.
  - `include_overdue`: `z.boolean().optional()` — default `true`; only applies when `date === today`.
- Output:

```json
{
  "today": "2026-10-28",
  "date": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "tasks": [/* compact tasks */],
  "overdue": [/* compact tasks */],
  "counts": {
    "tasks": 6,
    "tasks_open": 5,
    "tasks_completed": 1,
    "overdue": 15
  },
  "truncated": {"tasks": false, "overdue": false}
}
```

Behavior:

1. Compute `today` via `todayInZone(clock(), config.timeZone)`.
2. Validate `date` if provided; default `today`.
3. Query `/todo/query?start=<date>&end=<date>&order=asc&limit=<maxTasks+1>`.
4. Query `/todo/count?start=<date>&end=<date>` for exact counts.
5. If `date === today` and `include_overdue !== false`:
   - Query `/todo/query?end=<today-1>&status=open&order=asc&limit=<maxTasks+1>`.
   - Query `/todo/count?end=<today-1>&status=open` for exact overdue count.
6. Truncate each list to `maxTasks`; set `truncated.tasks` / `truncated.overdue`.
7. Sort day tasks by `dayOrder` then `id` before compacting. Sort overdue by `taskDate` then `id`.
8. Compact each task with `overdue` computed.

If `date !== today`, `overdue` is `[]` and `counts.overdue` is `0`.

#### `get_week`

- Description: `Get tasks for the current week (Mon-Sun, Asia/Kolkata). week_offset moves weeks.`
- Input schema:
  - `week_offset`: `z.number().int().min(-52).max(52).optional()` — default `0`.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01", "offset": 0},
  "days": [
    {
      "date": "2026-10-26",
      "weekday": "Mon",
      "tasks": [/* compact tasks */],
      "counts": {"total": 2, "open": 0, "completed": 2}
    }
  ],
  "counts": {"total": 13, "open": 7, "completed": 6},
  "truncated": false
}
```

Behavior:

1. Compute `today` and current week bounds.
2. Apply `week_offset * 7` days to the week start.
3. Query `/todo/query?start=<weekStart>&end=<weekEnd>&order=asc&limit=<maxTasks+1>`.
4. Query `/todo/count?start=<weekStart>&end=<weekEnd>` for exact top-level counts.
5. Truncate the flat task list to `maxTasks`; set `truncated`.
6. Group into exactly 7 days, Monday through Sunday. Include empty days.
7. Sort each day by `dayOrder` then `id`.
8. Per-day `counts` are computed from the returned (possibly truncated) tasks. Top-level `counts` are exact from `/todo/count`.
9. `weekday` values: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`.

No overdue section in the week view.

Anchor note: every tool response includes `today` and a `week` object. For `get_week`, `week` is the requested week and includes `offset`; for all other tools, `week` is the current week containing `today`. This gives the model a stable date anchor without making it calculate the week itself.

#### `count_tasks`

- Description: `Count tasks matching filters. Returns counts only, never task lists.`
- Input schema:
  - `query`: `z.string().optional()` — name substring, case-insensitive.
  - `exact_name`: `z.string().optional()` — exact name, case-insensitive.
  - `project`: `z.string().optional()` — exact project/category, case-insensitive.
  - `from`: `z.string().regex(ISO_DATE).optional()` — inclusive.
  - `to`: `z.string().regex(ISO_DATE).optional()` — inclusive.
  - `status`: `z.enum(["all", "open", "completed"]).optional()` — default `all`.
  - `recurring`: `z.boolean().optional()` — `true` only recurring, `false` only non-recurring.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "count": 12,
  "open": 5,
  "completed": 7,
  "filters": {
    "query": "photo",
    "exact_name": null,
    "project": "Personal",
    "from": "2026-10-01",
    "to": "2026-10-31",
    "status": "all",
    "recurring": null
  }
}
```

Behavior:

- Validate `from <= to`; otherwise `fail("invalid_range", ...)`.
- Call `/todo/count` with mapped params:
  - `query` → `q`
  - `exact_name` → `exactName`
  - `project` → `project`
  - `from` → `start`
  - `to` → `end`
  - `status` → `status`
  - `recurring` → `recurring`
- Echo the normalized filters with a stable shape: include all filter keys and use `null` for absent values. Do not omit keys.
- Never fetch or return task names.

#### `find_task`

- Description: `Find one task matching filters, ordered by task date. Use exact_name for recurring task names.`
- Input schema:
  - `order`: `z.enum(["latest", "oldest"])` — required.
  - Same filters as `count_tasks`: `query`, `exact_name`, `project`, `from`, `to`, `status`, `recurring`.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "found": true,
  "task": {/* compact task */},
  "filters": {/* same shape as count_tasks */}
}
```

Behavior:

- Validate `from <= to`; otherwise `fail("invalid_range", ...)`.
- Map `order=latest` → `order=desc`; `order=oldest` → `order=asc`.
- Call `/todo/query?...&limit=1`.
- If empty: `{"found": false, "task": null, ...}` with `isError` false.
- If one: compact it and return.
- Tie-break is handled by the backend: `taskDate`, then `id`.

Examples for the model:

- Last completed "Take daily photo": `{exact_name:"Take daily photo", order:"latest", status:"completed"}`
- Oldest open task in a project: `{project:"Personal", order:"oldest", status:"open"}`

#### `create_task`

- Description: `Create a task on a date today or later. Call get_day first if you do not know today's date.`
- Input schema:
  - `name`: `z.string().min(1).max(200)` — required.
  - `date`: `z.string().regex(ISO_DATE).optional()` — default today.
  - `project`: `z.string().max(50).optional()` — default `"None"`.
  - `priority`: `z.number().int().min(0).max(4).optional()` — default `0`.
  - `long_term`: `z.boolean().optional()` — default `false`.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "task": {/* compact task */}
}
```

Behavior:

1. Trim `name`; reject empty with `invalid_name`.
2. Validate `date`; default `today`.
3. If `date < today`, `fail("date_in_past", "date must be today or later", {today, week})`.
4. Normalize `project`: trim; empty → `"None"`.
5. Call `/todo/add?category=<project>&name=<name>&taskDate=<date>&priority=<priority>&longTerm=<bool>`.
6. If `result.status` starts with `"Error"`, `fail("backend_error", result.status)`.
7. Return compact `result.item`.

Do not send `repeatType` or `repeatDuration`. `create_task` never creates recurring tasks.

#### `update_task`

- Description: `Update name, date, project, priority, or long_term by id. Use complete_task to change completion.`
- Input schema:
  - `id`: `z.number().int().positive()` — required.
  - `name`: `z.string().min(1).max(200).optional()`
  - `date`: `z.string().regex(ISO_DATE).optional()`
  - `project`: `z.string().max(50).optional()`
  - `priority`: `z.number().int().min(0).max(4).optional()`
  - `long_term`: `z.boolean().optional()`
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "task": {/* compact task */},
  "updated_fields": ["name", "date"],
  "warnings": []
}
```

Behavior:

1. If no optional field is provided, `fail("no_fields", "provide at least one field")`.
2. `GET /todo/item/{id}`. If 404, `fail("task_not_found", ...)`.
3. Validate:
   - `name` trimmed non-empty.
   - `date` valid and `>= today`; otherwise `date_in_past`.
   - `project` trimmed; empty → `"None"`.
   - `priority` 0–4 (schema already enforces).
4. Apply fields in this exact order: `name`, `date`, `project`, `priority`, `long_term`.
5. Map to backend fields:
   - `name` → `taskName`
   - `date` → `taskDate`
   - `project` → `category`
   - `priority` → `priority`
   - `long_term` → `longTerm`
6. For each field, call `POST /todo/update?id=<id>&field=<mapped>&value=<value>`.
7. If `result.status` starts with `"Error"`, re-fetch the task, return `fail("backend_error", result.status, {failed_field, updated_fields, task})`.
8. After all updates, `GET /todo/item/{id}` and return the compact task.
9. `warnings` is empty unless a later step needs to report a non-fatal issue.

Do not allow `complete` or `inProgress` in this tool.

#### `complete_task`

- Description: `Mark a task complete. If it recurs, create the next instance (duplicate-safe) and return it.`
- Input schema:
  - `id`: `z.number().int().positive()` — required.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "task": {/* compact completed task */},
  "next_task": {/* compact next task */} ,
  "warnings": []
}
```

Behavior:

1. `GET /todo/item/{id}`. If 404, `fail("task_not_found", ...)`.
2. If `task.complete === true`:
   - Return `{task: compact(task), next_task: null, warnings: ["already_complete"]}`.
   - Do not call update. Do not create a next instance.
3. `POST /todo/update?id=<id>&field=complete&value=true`.
4. If `status` starts with `"Error"`, `fail("backend_error", status)`.
5. Best-effort clear in-progress: `POST /todo/update?id=<id>&field=inProgress&value=false`.
   - If it fails, add warning `"in_progress_clear_failed"`; completion still succeeds.
6. Determine recurrence:
   - `repeatType` must be one of `EVERY_X_DAYS`, `EVERY_X_WEEKS`, `EVERY_X_MONTHS`, `SPECIFIC_WEEKDAYS`.
   - `repeatDuration` must be an integer > 0. For `SPECIFIC_WEEKDAYS`, must be 1–127.
   - Otherwise: warning `"invalid_repeat_rule"`; no next task.
7. Compute `nextDate` with `nextOccurrence(task)`.
8. Duplicate check:
   - `GET /todo/query?exactName=<name>&project=<category>&start=<nextDate>&end=<nextDate>&limit=50`.
   - If any returned task has `id !== completedTask.id`, skip creation and add warning `"next_instance_exists"`.
   - This check is case-insensitive because the backend `exactName` and `project` filters are case-insensitive.
9. Create next instance:
   - `POST /todo/add` with:
     - `name` = completed task name
     - `category` = completed task category (or `"None"`)
     - `taskDate` = `nextDate`
     - `priority` = completed task priority (or `0`)
     - `repeatType` = completed task repeatType
     - `repeatDuration` = completed task repeatDuration
     - `longTerm` = completed task longTerm
   - `/todo/add` defaults `complete=false`, `inProgress=false`, `assignedTime=null`, `timeTaken=null`.
   - If it fails, add warning `"next_instance_create_failed"` with the error message; completion still succeeds.
10. Return the completed task (from the update response or a re-fetch) and the compact `next_task` (or `null`).

Important: The next date may be in the past if the completed task was far overdue and the repeat interval is small. This matches the frontend behavior. Do not reject it.

#### `uncomplete_task`

- Description: `Mark a task incomplete and clear its completion time.`
- Input schema:
  - `id`: `z.number().int().positive()` — required.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "task": {/* compact task */},
  "warnings": []
}
```

Behavior:

1. `GET /todo/item/{id}`. If 404, `fail("task_not_found", ...)`.
2. If `task.complete === false`:
   - Return `{task: compact(task), warnings: ["already_incomplete"]}`.
   - Do not call update.
3. `POST /todo/update?id=<id>&field=complete&value=false`.
4. `POST /todo/update?id=<id>&field=assignedTime&value=null` (literal string `null`).
   - If it fails, add warning `"assigned_time_clear_failed"`.
5. Re-fetch and return compact task.

#### `delete_task`

- Description: `Delete a task. Requires the exact current task name as a safety check.`
- Input schema:
  - `id`: `z.number().int().positive()` — required.
  - `name`: `z.string().min(1)` — required.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "deleted": true,
  "task": {/* compact pre-delete task */}
}
```

Behavior:

1. `GET /todo/item/{id}`. If 404, `fail("task_not_found", ...)`.
2. Compare `name.trim().toLowerCase()` with `task.name.trim().toLowerCase()`.
   - Mismatch: `fail("name_mismatch", "name does not match task", {actual_name: task.name, id})`.
3. `DELETE /todo/delete/{id}`. Ignore the returned boolean.
4. `GET /todo/item/{id}` again.
   - If it still returns 200, `fail("delete_failed", "task still exists after delete")`.
   - If it throws `ApiError` with code `task_not_found` (HTTP 404), treat it as success.
   - Any other error is a real failure.
5. Return the compact pre-delete task.

#### `list_projects`

- Description: `List project names (backend category) and total task counts.`
- Input schema: none.
- Output:

```json
{
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"},
  "projects": [
    {"name": "None", "count": 445},
    {"name": "Personal", "count": 71}
  ]
}
```

Behavior:

- `GET /todo/projects`.
- Return the array as-is.
- Document that projects with zero tasks live only in browser localStorage and are not visible here.

### 6.7 Compact task shape

Every task returned by a tool uses exactly this shape:

```json
{
  "id": 7358,
  "name": "Take daily photo",
  "date": "2026-10-28",
  "project": "Personal",
  "priority": 0,
  "complete": false,
  "in_progress": false,
  "long_term": false,
  "repeat": "EVERY_X_DAYS",
  "overdue": false,
  "completed_at": "09:15:00"
}
```

Rules:

- `project`: null/blank category → `"None"`.
- `repeat`: `null` when `repeatType` is null or `"NONE"`; otherwise the enum string.
- `overdue`: `true` only when `complete === false` and `date < today`. Completed tasks are never overdue.
- `completed_at`: include only when `complete === true` and `assignedTime` is non-null and not the literal string `"null"`. Value is `HH:mm:ss` from the backend. It is a time of day, not a full timestamp, because the backend does not store a completion date.
- Do not include `dayOrder`, `repeatDuration`, `timeTaken`, or `assignedTime` in the compact shape.
- Keep field order stable as shown. Stable JSON is easier to test and easier for a small model to read.

### 6.8 Date and week logic

`src/dates.js` must export:

```js
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(value)
export function assertIsoDate(value, fieldName)
export function todayInZone(now, timeZone)
export function addDays(isoDate, days)
export function weekBounds(isoDate)
export function weekBoundsForOffset(today, offset)
export function weekdayShort(isoDate)
```

Implementation requirements:

- Use `dayjs` with the `utc` plugin for date-only arithmetic. Never use `new Date("YYYY-MM-DD")` with local timezone semantics.
- `todayInZone` uses `Intl.DateTimeFormat` with `timeZone`, not the host timezone. Use `formatToParts` and assemble `YYYY-MM-DD`; do not rely on locale-specific `.format()` output:

```js
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).formatToParts(now);
const get = (type) => parts.find((p) => p.type === type).value;
return `${get("year")}-${get("month")}-${get("day")}`;
```
- `isIsoDate` must reject impossible dates such as `2026-02-30` and `2026-13-01`. Regex alone is not enough. Round-trip through dayjs and compare the formatted value to the input.
- `weekBounds`:

```js
const d = dayjs.utc(isoDate);
const start = d.subtract((d.day() + 6) % 7, "day");
const end = start.add(6, "day");
return {
  start: start.format("YYYY-MM-DD"),
  end: end.format("YYYY-MM-DD")
};
```

- `weekBoundsForOffset(today, offset)` adds `offset * 7` days to `today` before calling `weekBounds`.
- `weekdayShort` returns `["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dayjs.utc(isoDate).day()]`.
- `addDays` uses `dayjs.utc(isoDate).add(days, "day").format("YYYY-MM-DD")`.

### 6.9 Recurrence logic

`src/recurrence.js`:

```js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

export const REPEAT_TYPES = [
  "EVERY_X_DAYS",
  "EVERY_X_WEEKS",
  "EVERY_X_MONTHS",
  "SPECIFIC_WEEKDAYS"
];

export function nextOccurrence(task) {
  const { taskDate, repeatType, repeatDuration } = task;

  if (!REPEAT_TYPES.includes(repeatType)) return null;
  if (!Number.isInteger(repeatDuration) || repeatDuration <= 0) return null;

  const d = dayjs.utc(taskDate);

  switch (repeatType) {
    case "EVERY_X_DAYS":
      return d.add(repeatDuration, "day").format("YYYY-MM-DD");
    case "EVERY_X_WEEKS":
      return d.add(repeatDuration, "week").format("YYYY-MM-DD");
    case "EVERY_X_MONTHS":
      return d.add(repeatDuration, "month").format("YYYY-MM-DD");
    case "SPECIFIC_WEEKDAYS": {
      if (repeatDuration > 127) return null;
      const bits = repeatDuration.toString(2).padStart(7, "0");
      let cursor = d;
      for (let i = 0; i < 7; i++) {
        cursor = cursor.add(1, "day");
        const dayIndex = (cursor.day() + 6) % 7; // 0 = Monday, 6 = Sunday
        if (bits[dayIndex] === "1") {
          return cursor.format("YYYY-MM-DD");
        }
      }
      return null;
    }
    default:
      return null;
  }
}
```

This must match `frontend-next/hooks/useTaskManagement.js:278-305` exactly. Note that dayjs `add(n, "month")` clamps end-of-month (Jan 31 + 1 month → Feb 28/29). Test that.

### 6.10 API client

`src/api.js` must export `TodoApi` and `ApiError`.

```js
export class ApiError extends Error {
  constructor(code, message, { status, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}
```

`TodoApi` constructor: `{ baseUrl, timeoutMs = 5000, fetchImpl = fetch }`.

Methods:

```js
query(params)      // GET /todo/query
count(params)      // GET /todo/count
getItem(id)        // GET /todo/item/{id}
projects()         // GET /todo/projects
add(params)        // POST /todo/add
update(id, field, value) // POST /todo/update
delete(id)         // DELETE /todo/delete/{id}
```

Rules:

- Build URLs with `new URL(path, baseUrl)`.
- Add query params only when the value is not `undefined`, not `null`, and not `""`.
- Use `AbortController` with `timeoutMs`.
- On HTTP 404 for `getItem`, throw `ApiError("task_not_found", ..., {status: 404})`.
- On other non-2xx, throw `ApiError("backend_error", ..., {status})`.
- On abort, throw `ApiError("backend_timeout", "Backend request timed out")`.
- On network failure, throw `ApiError("backend_unreachable", "Cannot reach the todo backend")`.
- On invalid JSON, throw `ApiError("invalid_response", "Backend returned invalid JSON")`.
- For `/todo/update`, do not throw on a logical error body; return the parsed body so the tool can inspect `status`.
- For `/todo/delete`, return the parsed boolean; the tool ignores it.
- Set `Accept: application/json`.
- POST requests use query params, not JSON bodies, because the existing controller uses `@RequestParam`.

### 6.11 Error and warning codes

Tool errors (`isError: true`):

| Code | When |
|---|---|
| `invalid_date` | Date is not a valid `YYYY-MM-DD` |
| `date_in_past` | Create/update date is before today |
| `invalid_range` | `from > to` |
| `invalid_name` | Empty name |
| `invalid_priority` | Priority outside 0–4 (schema usually catches this) |
| `task_not_found` | Id does not exist |
| `name_mismatch` | Delete name does not match |
| `no_fields` | `update_task` called with no fields |
| `backend_unreachable` | Cannot connect to Spring Boot |
| `backend_timeout` | Backend request timed out |
| `backend_error` | Backend returned a logical error or non-2xx |
| `invalid_response` | Backend returned non-JSON |
| `delete_failed` | Task still exists after delete |
| `internal_error` | Unexpected exception; details are logged, not returned |

Warnings (returned in `warnings`, not errors):

| Warning | When |
|---|---|
| `already_complete` | `complete_task` on an already complete task |
| `already_incomplete` | `uncomplete_task` on an already incomplete task |
| `in_progress_clear_failed` | Completion succeeded but clearing `inProgress` failed |
| `assigned_time_clear_failed` | Uncompletion succeeded but clearing `assignedTime` failed |
| `invalid_repeat_rule` | Recurring task has an invalid repeat type/duration |
| `next_instance_exists` | Duplicate next instance already exists |
| `next_instance_create_failed` | Next instance creation failed |

Every error response must include `today` and `week` anchors when they can be computed. For example:

```json
{
  "error": "date_in_past",
  "message": "date must be today or later",
  "today": "2026-10-28",
  "week": {"start": "2026-10-26", "end": "2026-11-01"}
}
```

## 7. Test plan

### 7.1 Required commands

These must pass from a clean checkout:

```bash
cd backend-springboot
./mvnw test

cd ../mcp
npm install        # first time; creates package-lock.json
npm test
```

After the lockfile exists, use `npm ci` in CI or a clean environment.

Do not make `npm test` depend on a running Spring Boot server. The MCP tests use a fake backend.

### 7.2 Java test cases

The 22 cases in section 5.5 are required. Additionally, the existing tests must pass.

### 7.3 Node test cases

#### `test/dates.test.js`

| Test | Input | Expected |
|---|---|---|
| `todayInZoneBeforeMidnight` | `2026-10-28T18:29:59Z`, Asia/Kolkata | `2026-10-28` |
| `todayInZoneAtMidnight` | `2026-10-28T18:30:00Z`, Asia/Kolkata | `2026-10-29` |
| `todayInZoneMorning` | `2026-01-01T00:00:00Z`, Asia/Kolkata | `2026-01-01` |
| `weekBoundsWednesday` | `2026-10-28` | `{start:"2026-10-26", end:"2026-11-01"}` |
| `weekBoundsMonday` | `2026-10-26` | same |
| `weekBoundsSunday` | `2026-11-01` | same |
| `weekBoundsYearBoundary` | `2026-12-31` | `{start:"2026-12-28", end:"2027-01-03"}` |
| `weekOffsetNext` | today `2026-10-28`, offset 1 | `{start:"2026-11-02", end:"2026-11-08"}` |
| `weekOffsetPrevious` | today `2026-10-28`, offset -1 | `{start:"2026-10-19", end:"2026-10-25"}` |
| `weekdayShort` | Mon/Sun dates | `"Mon"`, `"Sun"` |
| `addDaysYearBoundary` | `2026-12-31`, 1 | `2027-01-01` |
| `isIsoDateValid` | `2026-10-28` | true |
| `isIsoDateRejectsImpossible` | `2026-02-30`, `2026-13-01` | false |
| `isIsoDateRejectsFormat` | `2026-2-3`, `10/28/2026` | false |

#### `test/recurrence.test.js`

| Test | Input | Expected |
|---|---|---|
| `everyXDays` | 2026-10-28, 1 day | 2026-10-29 |
| `everyXWeeks` | 2026-10-28, 2 weeks | 2026-11-11 |
| `everyXMonthsClampNonLeap` | 2026-01-31, 1 month | 2026-02-28 |
| `everyXMonthsClampLeap` | 2024-01-31, 1 month | 2024-02-29 |
| `everyXMonthsYearBoundary` | 2026-12-31, 1 month | 2027-01-31 |
| `specificWeekdaysMonToFri` | 2026-10-30 (Fri), bitmask 124 | 2026-11-02 (Mon) |
| `specificWeekdaysMonWedFri` | 2026-10-27 (Tue), bitmask 84 | 2026-10-28 (Wed) |
| `specificWeekdaysSundayOnly` | 2026-11-01 (Sun), bitmask 1 | 2026-11-08 (Sun) |
| `specificWeekdaysZero` | bitmask 0 | null |
| `noneReturnsNull` | `NONE` | null |
| `nullReturnsNull` | null | null |
| `zeroDurationReturnsNull` | 0 | null |
| `negativeDurationReturnsNull` | -1 | null |
| `bitmaskOver127ReturnsNull` | 128 | null |
| `doesNotMutateInput` | task object | unchanged |

#### `test/tasks.test.js`

| Test | Expected |
|---|---|
| `compactTaskMapsFields` | Exact compact shape from section 6.7 |
| `compactTaskNullCategory` | `project: "None"` |
| `compactTaskNoneRepeat` | `repeat: null` for null/NONE |
| `compactTaskCompletedAt` | `completed_at` present only when complete and assignedTime non-null |
| `compactTaskOverduePastOpen` | `overdue: true` |
| `compactTaskNotOverdueCompleted` | `overdue: false` |
| `compactTaskNotOverdueFuture` | `overdue: false` |
| `groupWeekSevenDays` | 7 entries, Monday–Sunday |
| `groupWeekEmptyDays` | Empty days have `tasks: []` and zero counts |
| `groupWeekSortsDayOrder` | Lower dayOrder first |
| `normalizeProjectBlank` | `"None"` |

#### `test/api.test.js`

Use a fake backend built with `node:http`.

| Test | Expected |
|---|---|
| `queryBuildsParams` | Correct URL and query string; omits null/undefined/empty |
| `countBuildsParams` | Correct params |
| `getItem404` | `ApiError.code === "task_not_found"`, status 404 |
| `getItem200` | Parsed task |
| `addSendsQueryParams` | Correct params, POST |
| `updateSendsFieldAndValue` | Correct `id`, `field`, `value`; stringifies booleans/numbers |
| `updateReturnsLogicalError` | Parsed `{status:"Error: ..."}` is returned, not thrown |
| `deleteReturnsBoolean` | Parsed boolean |
| `projectsParsed` | Array |
| `timeout` | `ApiError.code === "backend_timeout"` |
| `unreachable` | `ApiError.code === "backend_unreachable"` |
| `invalidJson` | `ApiError.code === "invalid_response"` |

#### `test/tools.test.js`

Use a `FakeApi` with in-memory tasks and a fixed clock: `() => new Date("2026-10-28T10:00:00+05:30")`. Record every call.

Required cases:

| # | Test | Expected |
|---|---|---|
| 1 | `getDayDefaultsToToday` | Queries today and overdue; returns anchors, tasks, overdue, counts |
| 2 | `getDayExplicitPastDate` | No overdue query; overdue empty |
| 3 | `getDayIncludeOverdueFalse` | No overdue query |
| 4 | `getDayTruncatesTasks` | 51 returned → 50, `truncated.tasks=true` |
| 5 | `getDayTruncatesOverdue` | 51 returned → 50, `truncated.overdue=true` |
| 6 | `getWeekCurrent` | Query Mon–Sun; 7 days; correct grouping |
| 7 | `getWeekOffset` | Correct shifted bounds |
| 8 | `getWeekTruncates` | 51 returned → 50, `truncated=true` |
| 9 | `countTasksPassesFilters` | Correct backend params; counts returned |
| 10 | `countTasksInvalidRange` | `isError`, `invalid_range` |
| 11 | `findTaskLatest` | `order=desc&limit=1`; found true |
| 12 | `findTaskOldest` | `order=asc&limit=1`; found true |
| 13 | `findTaskNone` | found false, task null, not an error |
| 14 | `listProjects` | Projects returned |
| 15 | `createTaskValid` | Correct `/add` params; compact task returned |
| 16 | `createTaskDefaults` | Today, `None`, priority 0, long_term false |
| 17 | `createTaskPastDate` | `date_in_past`, no add call |
| 18 | `createTaskInvalidDate` | `invalid_date`, no add call |
| 19 | `createTaskEmptyName` | `invalid_name`, no add call |
| 20 | `updateTaskMultipleFields` | Calls fields in order; returns updated task |
| 21 | `updateTaskNoFields` | `no_fields`, no calls |
| 22 | `updateTaskNotFound` | `task_not_found` |
| 23 | `updateTaskPastDate` | `date_in_past`, no update call |
| 24 | `updateTaskBackendError` | `backend_error`, `failed_field`, partial `updated_fields` |
| 25 | `completeTaskNonRecurring` | Updates complete and inProgress; next_task null |
| 26 | `completeTaskAlreadyComplete` | No update; warning `already_complete` |
| 27 | `completeTaskRecurringCreatesNext` | Next task created with copied fields; next_task returned |
| 28 | `completeTaskDuplicateSkips` | No add; warning `next_instance_exists` |
| 29 | `completeTaskInvalidRule` | No add; warning `invalid_repeat_rule` |
| 30 | `completeTaskAddFails` | Warning `next_instance_create_failed`; task still returned |
| 31 | `completeTaskInProgressClearFails` | Warning `in_progress_clear_failed`; completion succeeds |
| 32 | `uncompleteTaskClearsAssignedTime` | Calls complete=false and assignedTime=null |
| 33 | `uncompleteTaskAlreadyIncomplete` | Warning `already_incomplete`; no update |
| 34 | `deleteTaskNameMatch` | Deletes and verifies 404 |
| 35 | `deleteTaskNameMismatch` | `name_mismatch`; no delete |
| 36 | `deleteTaskNotFound` | `task_not_found` |
| 37 | `deleteTaskVerifyFails` | `delete_failed` |
| 38 | `deleteTaskIgnoresFalseBoolean` | API returns `false` but re-fetch 404 → success |

#### `test/http.test.js`

Start the real Express app with a `FakeApi` on an ephemeral port. Use the official SDK client:

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
```

Required cases:

| Test | Expected |
|---|---|
| `initialize` | `serverInfo.name === "todo-mcp"` |
| `toolsList` | Exactly 10 tools with the expected names |
| `callGetDay` | Tool result text parses to JSON with `today`, `week`, `tasks` |
| `getMcpReturns405` | HTTP 405 |
| `deleteMcpReturns405` | HTTP 405 |
| `corsPreflightAllowed` | `OPTIONS` from `http://localhost:3001` returns CORS header |
| `corsPreflightDisallowed` | `OPTIONS` from `http://evil.example` has no `Access-Control-Allow-Origin` |
| `health` | `GET /health` returns `{ok:true}` |

Always close the SDK client and HTTP server in `finally`.

### 7.4 Manual smoke test

Optional, against the dev backend only:

```bash
# terminal 1
cd backend-springboot
./mvnw spring-boot:run

# terminal 2
cd mcp
TODO_API_URL=http://127.0.0.1:8000 npm start

# terminal 3
curl -s http://127.0.0.1:8765/health
```

Then connect an MCP client to `http://127.0.0.1:8765/mcp` and call:

1. `get_day` with `{}` → today's tasks + overdue.
2. `get_week` with `{}` → 7 days.
3. `count_tasks` with `{"query":"photo"}` → count only.
4. `find_task` with `{"exact_name":"Take daily photo","order":"latest"}` → one task.
5. `list_projects` with `{}` → project counts.
6. `create_task` with a unique name for today.
7. `update_task` to rename it.
8. `complete_task` on a non-recurring task.
9. `uncomplete_task` on the same task.
10. `delete_task` with the correct id and name.

Do not run the smoke test against `5555` unless you intend to modify prod.

## 8. Implementation order

Follow this order. Do not skip checkpoints.

1. **Backend DTOs and service**
   - Add `TaskQuery`, `TaskCounts`, `ProjectCount`.
   - Add service methods and helpers.
   - Checkpoint: `cd backend-springboot && ./mvnw clean compile`.

2. **Backend controller**
   - Add `/query`, `/count`, `/item/{id}`, `/projects`.
   - Checkpoint: `./mvnw test` (existing tests still pass).

3. **Backend query tests**
   - Add `TodoQueryIntegrationTest` with all 22 cases.
   - Checkpoint: `./mvnw test` (all pass).

4. **MCP scaffolding**
   - `package.json`, `.gitignore`, `config.js`, `dates.js`, `recurrence.js`, `tasks.js`, `errors.js`.
   - Checkpoint: `cd mcp && npm install && npm test` (date/recurrence/tasks tests pass).

5. **MCP API client**
   - `api.js` and `api.test.js`.
   - Checkpoint: `npm test`.

6. **MCP read tools**
   - `tools/shared.js`, `tools/read.js`, `tools/index.js`.
   - Tests for `get_day`, `get_week`, `count_tasks`, `find_task`, `list_projects`.
   - Checkpoint: `npm test`.

7. **MCP write tools**
   - `tools/write.js`.
   - Tests for create/update/complete/uncomplete/delete and recurrence.
   - Checkpoint: `npm test`.

8. **MCP HTTP app**
   - `app.js`, `mcp.js`, `server.js`.
   - `http.test.js`.
   - Checkpoint: `npm test`.

9. **Docs and DOX**
   - `mcp/README.md`, `mcp/AGENT.md`.
   - Update root `AGENT.md` Child DOX Index.
   - Update `backend-springboot/AGENT.md` with the new query endpoints.
   - Checkpoint: re-read the DOX chain and confirm no stale text.

10. **Final verification**
    - `cd backend-springboot && ./mvnw test`
    - `cd mcp && npm test`
    - Optional dev smoke test.

## 9. Acceptance criteria

The implementation is done when all of these are true:

- `./mvnw test` passes in `backend-springboot/`.
- `npm test` passes in `mcp/`.
- `GET /todo/query`, `/todo/count`, `/todo/item/{id}`, and `/todo/projects` behave exactly as specified.
- The MCP server starts with `npm start` and listens on `127.0.0.1:8765/mcp`.
- `tools/list` returns exactly these 10 tools: `get_day`, `get_week`, `count_tasks`, `find_task`, `create_task`, `update_task`, `complete_task`, `uncomplete_task`, `delete_task`, `list_projects`.
- `get_day` includes today's tasks and overdue open tasks, capped at 50 each.
- `get_week` returns exactly 7 days, Monday–Sunday.
- `count_tasks` returns no task names or task list.
- `find_task` returns exactly one task or `found:false`.
- `create_task` rejects past dates and never creates recurring tasks.
- `update_task` cannot change completion.
- `complete_task` on a recurring task creates exactly one next instance and skips duplicates with a warning.
- `complete_task` on an already complete task creates nothing and returns `already_complete`.
- `uncomplete_task` clears `assignedTime`.
- `delete_task` with a mismatched name deletes nothing.
- `delete_task` with the correct name verifies the item is gone, even if the API returns `false`.
- Every tool result is a single compact JSON text block.
- Every tool result that can compute dates includes `today` and `week` anchors.
- The MCP server never reads SQLite and never calls `/todo/all` for queries.
- The MCP server defaults to `http://127.0.0.1:8000` and only touches prod when `TODO_API_URL` is explicitly set to `http://127.0.0.1:5555`.

## 10. DOX and documentation updates

### New `mcp/AGENT.md`

```markdown
# MCP Server (todo-mcp)

## Purpose

Own the HTTP MCP bridge between local AI clients and the Spring Boot todo API.

## Ownership

All files under `mcp/`.

## Local Contracts

- Node 24 ESM JavaScript; no build step.
- Stateless Streamable HTTP at `127.0.0.1:8765/mcp`.
- Never access SQLite directly; all data goes through `TODO_API_URL`.
- Tool results are compact JSON; task lists are capped at 50.
- `TODO_API_URL` defaults to the dev backend on port 8000; prod is 5555.
- Timezone is `Asia/Kolkata`; weeks are Monday–Sunday.
- `project` maps to the backend `category` field.
- `update_task` maps `name` to backend `taskName`.
- Never trust the `/todo/delete/{id}` boolean; verify by re-fetching.

## Work Guidance

- Add read tools in `src/tools/read.js`, write tools in `src/tools/write.js`, register in `src/tools/index.js`.
- Keep pure date logic in `src/dates.js` and recurrence logic in `src/recurrence.js`.
- Keep tool descriptions short; the target model has a 40k context.
- Do not add a full search-list tool; use `count_tasks`, `find_task`, `get_day`, and `get_week`.

## Verification

- `cd mcp && npm test`
- `cd backend-springboot && ./mvnw test`

## Child DOX Index

None
```

### Root `AGENT.md`

Add to the Child DOX Index:

```markdown
| MCP Server | `mcp/AGENT.md` | HTTP MCP bridge, tool schemas, recurrence logic |
```

### `backend-springboot/AGENT.md`

Add under Local Contracts or Work Guidance:

```markdown
- Query endpoints: `/todo/query`, `/todo/count`, `/todo/item/{id}`, `/todo/projects`
- Query filtering is in-memory in `TodoService`; acceptable for the current dataset size
```

### `mcp/README.md`

Include:

- What the server does.
- Prerequisites: Node 20+, Spring Boot running on 8000.
- Install: `npm install`; then `npm ci` in clean environments.
- Run: `npm start`.
- Env table from section 6.3.
- MCP endpoint: `http://127.0.0.1:8765/mcp`.
- Client example using `StreamableHTTPClientTransport`.
- Tool list with one-line descriptions.
- Testing commands.
- Troubleshooting: backend unreachable, port in use, CORS, prod vs dev.

## 11. Non-goals and risks

### Non-goals for v1

- No `assignedTime`, `timeTaken`, or `dayOrder` in tool schemas or compact output.
- `in_progress` is read-only in v1; `update_task` cannot change it. `complete_task` clears it.
- No task search that returns a list; use count/find/day/week.
- No recurring task creation or recurrence-rule editing.
- No scratchpad tools.
- No authentication.
- No multi-user support.
- No direct SQLite access.
- No frontend changes.
- No prod deploy automation changes.

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| In-memory backend filtering is O(n) per request | Acceptable at ~519 rows; document the 10k threshold |
| Stateless HTTP may not suit a client that requires sessions | The SDK supports sessionful mode later; keep transport isolated in `app.js` |
| Multi-field updates are not atomic | Apply sequentially, return `failed_field` and partial `updated_fields` |
| Recurrence can create a past-due next instance | Matches frontend behavior; document it |
| UI and MCP could complete the same recurring task simultaneously | Duplicate check on next date; worst case is a skipped duplicate |
| `delete` returns `isComplete()` | Always verify by re-fetching |
| `update` returns HTTP 200 on logical errors | Always inspect `status` |
| `uncomplete` leaves `assignedTime` set | Explicitly clear it with a second update |
| `complete` leaves `inProgress` set | Explicitly clear it with a second update |
| Projects with zero tasks are invisible | Document that they live only in browser localStorage |
| Model miscalculates dates | ISO-only dates plus `today`/`week` anchors in every response |
| Model sends a wrong delete id | Require exact name match |
| Model overwhelms context | Cap lists at 50; count/find tools return no lists |

## 12. Assumptions to confirm during implementation

These are intentionally resolved in this plan; change only with user approval.

- The web UI/custom MCP client can speak stateless Streamable HTTP. If it cannot, switch `app.js` to sessionful mode without changing tool logic.
- The web UI origin is `http://localhost:<port>` or `http://127.0.0.1:<port>`. If it is served from another hostname, add it to the CORS regex.
- `Asia/Kolkata` remains the user's timezone.
- Dev backend on 8000 is the default target; prod on 5555 is opt-in.
- The backend can tolerate the extra `/query` and `/count` calls for a single-user local app.
- A project is the backend `category` field; localStorage-only projects are out of scope.
