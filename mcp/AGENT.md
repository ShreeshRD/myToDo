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
- `update_task` maps `name` → `taskName`, `description` → `description`, `goal_id` → `goalId` (null unlinks).
- `create_task` accepts `goal_id` (sets long_term) and `description` (applied via patch after create).
- `push_task` maps to `POST /todo/push` (`reason` required, `date` optional/`+1` default); returns completed `task` + deferred `clone`.
- Goals/skills: `list_goals`, `create_goal`, `update_goal`, `delete_goal` (exact title required), `complete_goal` (`reopen=true` to reverse).
- Roadmap: `add_roadmap_step` (omit `date` for backlog), `reorder_roadmap` (full ordered id list). Step rename/date/complete/delete use `update_task` / `complete_task` / `delete_task`.
- Subtasks: `list_subtasks`, `add_subtask`, `update_subtask`, `delete_subtask` — checklist rows only, never day-list tasks.
- Skills: `log_skill_occurrence` (duration_minutes > 0 and rating 1–5 required), `list_skill_occurrences`, `update_skill_occurrence`, `delete_skill_occurrence`. Skills are `kind=SKILL` goals; never link them to tasks.
- Never trust the `/todo/delete/{id}` boolean; verify by re-fetching.

## Work Guidance

- Add read tools in `src/tools/read.js`, write tools in `src/tools/write.js`, register in `src/tools/index.js`.
- Keep pure date logic in `src/dates.js`. Recurrence is server-side: `complete_task` only marks complete and returns `next_task` / `warnings` from the backend response.
- Keep tool descriptions short; the target model has a 40k context.
- Do not add a full search-list tool; use `count_tasks`, `find_task`, `get_day`, and `get_week`.
- `scripts/classify.mjs` is a client of the MCP bridge, not a tool: it uses `list_projects`, `get_day`/`get_week`, and `update_task` only. It is dry-run by default and writes only with explicit `--apply`.
- Classification targets open tasks with project `None`, and labels are constrained to existing projects plus `None`. Never invent project names.

## Verification

- `cd mcp && npm test`
- `cd backend-springboot && ./mvnw test`

## Child DOX Index

None
