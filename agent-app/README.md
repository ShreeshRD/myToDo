# myToDo — Agent app

An [agent-native](https://agent-native.com) chat app that reads and edits myToDo tasks through typed actions (`actions/`), each proxying to the Spring Boot backend. It also serves an MCP endpoint (`/mcp`) that exposes only the read-only actions to external agents.

See [`../plan/project-overview.md`](../plan/project-overview.md) for the whole project, and [`AGENT.md`](AGENT.md) for contracts, verification and known environment issues.

## Prerequisites

- Node v24.x and `pnpm@10.29.1` (`npx pnpm@10.29.1` works too)
- The agent-native framework checked out at `../agent-native` — it is linked, not installed from npm. The folder is an empty gitlink after cloning this repo; clone the framework there and check out commit `40982a7f` (details in `AGENT.md`).
- The backend running on port 8000 (dev) or 5555 (prod)

## Run

```bash
cp .env.example .env          # set AUTH_DISABLED=true to skip login locally
pnpm install
pnpm run dev                  # http://localhost:8080
```

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Spring Boot base URL (default `http://localhost:8000`, or `:5555` when `NODE_ENV=production`) |
| `BACKEND_AUTH_TOKEN` | Optional bearer token sent to the backend |
| `AUTH_DISABLED` | `true` skips the login screen in local dev |
| `BETTER_AUTH_SECRET` | Session secret (required in production) |

## Actions

| Action | Backend call | Approval |
|---|---|---|
| `listTasks` | `GET /todo/allbydate` or `/todo/all` | — |
| `getScratchpad` | `GET /todo/scratchpad` | — |
| `createTask` | `POST /todo/add` | — |
| `updateTask` | `POST /todo/update` | required |
| `deleteTask` | `DELETE /todo/delete/{id}` | required |
| `saveScratchpad` | `POST /todo/scratchpad` | required |

Mutating actions are recorded in the `action_audit_log` table of `data/app.db`.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm exec oxfmt --check .
python3 verify-mcp.py   # with the dev server running
```
