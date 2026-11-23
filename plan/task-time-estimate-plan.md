---
name: Task Time Estimate & Day Capacity Bar
status: pending
---

# Task Time Estimate & Day Capacity Bar — Implementation Plan

Repo: `/home/arch/programs/personal_organization/todo`
Execution rule: implement **one step at a time**, stop for user verification, then mark the step `[x]` and continue.

---

## 1. Settled decisions

### Effective estimate (per task)
- New nullable integer column `estimatedMinutes` on `TodoItem` (explicit estimate, same role `category`/project plays as a settable tag).
- **Effective estimate** used by the bar and UI:
  1. `estimatedMinutes` when set and `> 0`
  2. else `timeTaken` (ms from **Time me** / in-progress sessions) when `> 0`, converted to minutes (`ceil(ms / 60000)`)
  3. else the task is **not estimated** — excluded from the bar entirely
- Explicit estimate always wins over `timeTaken` when present.
- Units on the wire: **minutes** for `estimatedMinutes`; `timeTaken` stays **milliseconds** (existing stopwatch contract).
- Clearing: `estimatedMinutes` null / `0` / `"null"` clears the explicit estimate (fallback to `timeTaken` may still apply).

### Day capacity bar
- Daily free capacity constant: **180 minutes** (3 hours). Stored in frontend `lib/constants.js` as `DAY_FREE_MINUTES = 180` (not user-configurable in this pass).
- Bar sits **on top of a day** in:
  - Upcoming day columns (`ToDoDay` title row)
  - Today view header (above Tasks / Schedule columns)
- **Only tasks with an effective estimate** contribute.
- Segment math for a day:
  - `pending` = sum of effective estimates of **incomplete** estimated tasks
  - `done` = sum of effective estimates of **complete** estimated tasks
  - `total` = `pending + done`
  - `scale` = `max(DAY_FREE_MINUTES, total)`  ← overflow: green can hit 0, orange/turquoise keep real minutes
  - `free` = `max(0, DAY_FREE_MINUTES - total)`
  - Widths: `free / scale`, `pending / scale`, `done / scale` (percent of bar)
- Colors:
  - **green** — free / remaining capacity
  - **orange-yellow** — yet-to-do (pending) estimated work
  - **turquoise** — completed estimated work
- Hide the bar when the day has **zero** estimated tasks (all-null / zero estimates).
- Overdue tasks are **not** part of a dated day's bar (they live outside `ToDoDay` lists); Today's overdue section is also excluded from the 3h budget.
- Tooltip / `title` (and optional small label): e.g. `1h 20m free · 1h pending · 40m done` of a 3h day.

### Recurrence / push inheritance
- Next occurrence (`generateNextOccurrence`) copies `estimatedMinutes` from the source (same as description / repeat settings).
- Push clone copies `estimatedMinutes` (same as other identity fields).
- New occurrence does **not** copy `timeTaken` (already true today) — only the explicit estimate travels.

### Time me linkage
- **Time me** (existing context-menu stopwatch → `StopwatchContext` → `timeTaken`) is unchanged as a recorder.
- When `estimatedMinutes` is null, the bar and drawer show the `timeTaken` fallback as the effective estimate, so recorded time feeds the day bar without a separate write path.
- Optional polish (same step as drawer): a one-click **“Use as estimate”** in the detail drawer that writes `estimatedMinutes = ceil(timeTaken / 60000)` when `timeTaken > 0`.

### MCP parity (same pattern as project/tags)
- `create_task` / `update_task` accept optional `estimated_minutes` (positive integer minutes; `null` on update clears).
- `compactTask` exposes `estimated_minutes` when set.
- Validation mirrors project handling: integers only; reject `<= 0` on set; `"null"` clears.

### Out of scope
- User-configurable capacity (stays hard-coded 3h).
- Calendar month cells, heatmap, goal strips.
- Multi-day / week aggregate bars.
- Auto-writing `estimatedMinutes` on every stopwatch stop (fallback is enough).
- Backend-served bar aggregation DTO (frontend computes from day task lists).

---

## 2. Data model

`backend-springboot/src/main/java/com/myapp/todo/TodoItem.java`
- Add: `private Integer estimatedMinutes;` (nullable; getter/setter or Lombok-consistent style with neighbors).
- Meaning: explicit planned duration in minutes; null = no explicit estimate.

Migration: SQLite + Hibernate `ddl-auto=update` adds the column. No Flyway. No backfill required (null means “use timeTaken fallback”).

---

## 3. Ordered steps (verify after each)

### [ ] Step 1 — Backend: field + patch + inheritance
Files:
- `backend-springboot/src/main/java/com/myapp/todo/TodoItem.java` — add `estimatedMinutes`
- `backend-springboot/src/main/java/com/myapp/todo/TodoService.java`
  - `applyField`: case `"estimatedMinutes"` — parse int; `null`/`""`/`"null"` → clear; `<= 0` → clear (or reject — **choose clear** for simple UI erase)
  - `TIMELINE_FIELDS` (line ~47): add `"estimatedMinutes"` so edits appear on the activity timeline
  - `generateNextOccurrence` (line ~335): `next.setEstimatedMinutes(source.getEstimatedMinutes())`
  - push clone (line ~150): `clone.setEstimatedMinutes(original.getEstimatedMinutes())`
- Tests: `TodoServiceTest` / `TodoRestControllerIntegrationTest` — patch set/clear; recurrence and push copy the estimate; invalid value handling

Verify: `cd backend-springboot && ./mvnw test`

### [ ] Step 2 — Frontend: store estimate + popup/drawer editing
Files:
- `frontend-next/service.js` — `addTask` accepts optional `estimatedMinutes` (pass through to POST body if the create endpoint already takes a map; otherwise patch after create like `description` in MCP — prefer extending `addTask` + `TodoRestController.add` if it binds a body; if create is query-param only, patch after create)
- `frontend-next/contexts/TaskContext.js` — `onPopupClose` (line ~132): accept `estimatedMinutes`, include in `updateTaskFields` on edit, and set on create when provided
- `frontend-next/components/CreateTaskPopup.js` — numeric input “Estimate (min)”; init from `task.estimatedMinutes`; submit with the rest
- `frontend-next/components/TaskDetailDrawer.js` — meta row `Estimate` showing effective minutes (explicit or `timeTaken` fallback); optional “Use as estimate” when `timeTaken > 0` and explicit is null; editable on blur or via popup only (drawer edit optional if popup already covers it — **minimum: display effective + “Use as estimate”**)
- `frontend-next/lib/dateHelpers.js` or `lib/taskHelpers.js` — pure helpers:
  - `effectiveEstimateMinutes(task)` → number | null
  - `formatMinutes(n)` → `"1h 20m"` / `"45m"`
- `frontend-next/lib/constants.js` — `DAY_FREE_MINUTES = 180`

Verify: create/edit task with estimate; clear estimate; drawer shows fallback after Time me; `npm run test` if helpers are unit-tested.

### [ ] Step 3 — Day capacity bar component + wire into Upcoming & Today
Files:
- New `frontend-next/components/DayCapacityBar.tsx`
  - Props: `tasks: Task[]`
  - Computes pending/done/free/scale as in §1; renders a single horizontal bar with three segments + accessible `title`
  - Hidden when no estimated tasks
- `frontend-next/components/ToDoDay.js` — under `todo_items_title` (line ~101), render `<DayCapacityBar tasks={tasks} />`
- `frontend-next/components/TodayView.js` — at top of `.today-main` / above Tasks column (after goal strip ~line 459), render `<DayCapacityBar tasks={[...todayTasks, ...Object.values(assignedTasks).flat()]} />` (dedupe by id; **exclude** `overdueTasks`)
- Styles: `frontend-next/styles/todoitem.css` (or a small `dayCapacityBar` CSS module / section in `todayview.scss`)
  - Segment classes: `.day-cap-free` (green), `.day-cap-pending` (orange-yellow), `.day-cap-done` (turquoise)
  - Respect `theme` / `.dark` / `.glass` like neighboring day chrome
  - Fixed height (~6–8px), full width of day column / Today header

Bar math edge cases (unit-test the pure function):
- All complete: free + done only; pending width 0
- Total 0 estimated: component returns null
- Total > 180: free 0; pending+done fill 100% of `scale`
- Mix of estimated and unestimated tasks: unestimated ignored
- `estimatedMinutes` set but 0 after clear: treated as null

Verify: Upcoming multi-day columns each show a correct bar; Today shows one bar; tasks without estimates never move the bar; complete moves orange → turquoise; green shrinks as pending grows.

### [ ] Step 4 — MCP parity
Files:
- `mcp/src/tasks.js` — `compactTask`: `if (raw.estimatedMinutes != null) compact.estimated_minutes = raw.estimatedMinutes`
- `mcp/src/tools/index.js` — `create_task` + `update_task` schemas: `estimated_minutes: z.number().int().positive().optional()` (update also allows `null` to clear — use `.nullish()` if the codebase already null-clears `goal_id` that way)
- `mcp/src/tools/write.js`
  - `FIELD_ORDER` / `FIELD_TO_BACKEND`: `estimated_minutes` → `estimatedMinutes`
  - create: include in params or post-create patch (mirror `description` if needed)
  - validation: positive integer on set; `null` → `"null"` clear
- `mcp/test/fixtures.js` — fake API `update`/`create` handle `estimatedMinutes`; recurrence clone copies it
- `mcp/test/tools.test.js` — set/clear/invalid; recurrence `next_task` keeps estimate; compact output includes `estimated_minutes`

Verify: `cd mcp && npm test`

### [ ] Step 5 — Docs (DOX pass) + optional prod
Files:
- `backend-springboot/AGENT.md` — Local Contracts: `estimatedMinutes` semantics, patch field, recurrence/push copy
- `frontend-next/AGENT.md` — day capacity bar contract (3h, colors, fallback, where it renders)
- `mcp/AGENT.md` — `estimated_minutes` on create/update, compact field
- Root `AGENT.md` — only if child index scope text needs a one-line note (likely unchanged)

Verify: re-read each changed AGENT.md against the DOX chain; remove stale text.

Prod (only when user asks): backup prod DB → `./update-prod.sh` → smoke-test bar + MCP set estimate.

---

## 4. Pinned / out of scope
- Configurable free-hours setting
- Calendar / heatmap / Skills integration
- Auto-promote `timeTaken` into `estimatedMinutes` on complete
- Backend API for precomputed day aggregates
- Estimating subtasks separately (parent estimate only)

## 5. Risks
- **SQLite `ddl-auto=update`**: new nullable `Integer` column is low-risk; still backup prod before deploy.
- **Create path shape**: if `POST /todo/add` is query-param only, estimate must be set via a follow-up `POST /todo/patch/{id}` (same pattern MCP uses for `description`).
- **Bar overcounting in Today**: assigned + unassigned + schedule slots can double-list if not deduped by task `id`; overdue must stay out of the 3h budget.
- **Units mix-up**: `timeTaken` is ms, estimate is minutes — convert only in `effectiveEstimateMinutes`; never store ms in `estimatedMinutes`.
- **Filter interaction**: project sidebar filters (`isTaskVisible`) already filter `taskDays`; bar uses the same lists so filtered-out projects correctly leave the bar (document this as intended).

## 6. Suggested pure-function sketch (Step 3)

```js
// lib/taskHelpers.js
export const DAY_FREE_MINUTES = 180; // or re-export from constants

export function effectiveEstimateMinutes(task) {
  if (!task) return null;
  if (task.estimatedMinutes != null && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }
  if (task.timeTaken != null && task.timeTaken > 0) {
    return Math.ceil(task.timeTaken / 60000);
  }
  return null;
}

export function dayCapacitySegments(tasks) {
  let pending = 0;
  let done = 0;
  let counted = 0;
  for (const t of tasks || []) {
    const m = effectiveEstimateMinutes(t);
    if (m == null) continue;
    counted += 1;
    if (t.complete) done += m;
    else pending += m;
  }
  if (counted === 0) return null;
  const total = pending + done;
  const scale = Math.max(DAY_FREE_MINUTES, total);
  const free = Math.max(0, DAY_FREE_MINUTES - total);
  return {
    free,
    pending,
    done,
    total,
    scale,
    pctFree: (free / scale) * 100,
    pctPending: (pending / scale) * 100,
    pctDone: (done / scale) * 100,
  };
}
```

## 7. Verification summary (end-to-end)

| Check | Expected |
|---|---|
| Task with `estimatedMinutes=30`, incomplete | Orange segment +30m on its day |
| Same task completed | Turquoise +30m; green unchanged |
| Task with only `timeTaken=900000` (15m), no explicit | Counts as 15m effective |
| Explicit `60` + `timeTaken=900000` | Counts as 60m (explicit wins) |
| Day with only unestimated tasks | No bar |
| Sum of estimates 240m | Green 0%; orange+turquoise fill bar (scale=240) |
| Recurring complete | `next_task.estimatedMinutes` equals source |
| Push | Clone carries `estimatedMinutes` |
| MCP `update_task estimated_minutes: 45` | Backend field set; compact shows `estimated_minutes: 45` |
| MCP `estimated_minutes: null` | Cleared; fallback may still apply |
| Tests | `./mvnw test`, `npm test` (frontend), `cd mcp && npm test` |
