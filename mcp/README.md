# todo-mcp

HTTP MCP server that lets local AI clients read and manage tasks through the Spring Boot todo API.

## What it does

- Exposes 10 MCP tools over stateless Streamable HTTP at `http://127.0.0.1:8765/mcp`.
- Reads today/week tasks, counts, and single-task lookups.
- Creates, updates, completes, uncompletes, and deletes tasks.
- Continues recurring chains when a recurring task is completed.
- Never touches SQLite; every call goes through the REST API at `TODO_API_URL`.

## Prerequisites

- Node 20+ (developed on Node 24)
- Spring Boot backend running (dev default: `http://127.0.0.1:8000`)

## Install

```bash
npm install          # first time
npm ci               # clean environments once package-lock.json exists
```

## Run

```bash
npm start
```

Logs go to stderr. The server listens on `http://127.0.0.1:8765/mcp`.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `TODO_MCP_HOST` | `127.0.0.1` | Bind address |
| `TODO_MCP_PORT` | `8765` | HTTP port |
| `TODO_MCP_PATH` | `/mcp` | MCP endpoint path |
| `TODO_API_URL` | `http://127.0.0.1:8000` | Spring Boot base URL; use `http://127.0.0.1:5555` for prod |
| `TODO_API_TIMEOUT_MS` | `5000` | Backend request timeout |
| `TODO_TIMEZONE` | `Asia/Kolkata` | Date boundary timezone |
| `TODO_MAX_TASKS` | `50` | Per-list response cap |

## MCP endpoint

`http://127.0.0.1:8765/mcp`

GET and DELETE on this path return HTTP 405. Use POST with a JSON-RPC MCP body.

Health check: `GET http://127.0.0.1:8765/health` → `{ok:true, api, today}`.

## Client example

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-app", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("http://127.0.0.1:8765/mcp")
);
await client.connect(transport);

const result = await client.callTool({ name: "get_day", arguments: {} });
console.log(JSON.parse(result.content[0].text));
```

## Tools

| Tool | Description |
|---|---|
| `get_day` | Tasks for a date (default today). Today also includes overdue open tasks. |
| `get_week` | Current week (Mon–Sun). `week_offset` shifts weeks. |
| `count_tasks` | Counts only; never returns task lists. |
| `find_task` | One task by filters; use `exact_name` for recurring names. |
| `create_task` | Create a non-recurring task on today or a future date. |
| `update_task` | Update name/date/project/priority/long_term by id. |
| `complete_task` | Mark complete; creates the next recurring instance when applicable. |
| `uncomplete_task` | Mark incomplete and clear completion time. |
| `delete_task` | Delete by id; requires exact current name as a safety check. |
| `list_projects` | Project names (backend `category`) with task counts. |

## Classify tasks with a local model

`scripts/classify.mjs` labels unclassified tasks (project `None`) using a local
`llama-server`. It talks only to the MCP bridge, so the dev/prod target is the
MCP server's `TODO_API_URL` (dev on `8000` by default).

```bash
npm start                                   # terminal 1: MCP on 8765
node scripts/classify.mjs                   # terminal 2: dry run, current week
node scripts/classify.mjs --scope day       # today + overdue
node scripts/classify.mjs --apply           # write labels
node scripts/classify.mjs --apply --confidence 0.8 --limit 25
```

- Defaults: `LLAMA_URL=http://127.0.0.1:9742`, `LLAMA_MODEL=My-Qwen`, `MCP_URL=http://127.0.0.1:8765/mcp`.
- Only open tasks with project `None` are candidates; labels are limited to existing projects plus `None`.
- Output is constrained with `json_schema` and falls back to `json_object` on older llama.cpp builds.
- Dry run is the default. `--apply` is required to call `update_task`; predictions below `--confidence` (default `0.6`) or labeled `None` are skipped.
- `--scope week` covers the current week; `--scope day` covers today plus all overdue open tasks (both capped by the MCP at 50 per list).
- `--help` lists all flags.

## Testing

```bash
npm test
```

Tests use a fake backend; Spring Boot does not need to be running.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `backend_unreachable` | Spring Boot is not running on `TODO_API_URL` |
| `backend_timeout` | Backend hung or network blocked; raise `TODO_API_TIMEOUT_MS` |
| Port in use | Another process on 8765; set `TODO_MCP_PORT` |
| CORS blocked | Origin must be `http://localhost:*` or `http://127.0.0.1:*` |
| Wrong data | Dev defaults to port 8000. Prod is only used when `TODO_API_URL=http://127.0.0.1:5555` |
| Delete seems to fail | The API returns `isComplete()`, not success; this server re-fetches to verify |
