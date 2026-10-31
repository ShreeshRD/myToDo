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
- `scripts/classify.mjs` is a client of the MCP bridge, not a tool: it uses `list_projects`, `get_day`/`get_week`, and `update_task` only. It is dry-run by default and writes only with explicit `--apply`.
- Classification targets open tasks with project `None`, and labels are constrained to existing projects plus `None`. Never invent project names.

## Verification

- `cd mcp && npm test`
- `cd backend-springboot && ./mvnw test`

## Child DOX Index

None
