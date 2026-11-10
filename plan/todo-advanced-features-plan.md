---
name: Todo Advanced Features
status: in-progress
---

# Advanced Task Lifecycle — Implementation Plan

Repo: `/home/arch/programs/personal_organization/todo`
Execution rule: implement **one step at a time**, stop for user verification, then mark the step `[x]` and continue.

---

## 1. Settled decisions

### Push / "not in my hands"
- A task can be **pushed**: you record a **required reason** and a **next date** (default `+3 days`, quick chips `+1d / +3d / +1w`).
- The current task is marked complete; a **clone** is created on the chosen date.
- Clone inherits: name, project, priority, `longTerm`, goal link, description, repeat settings, and **only unchecked subtasks**. Checked subtasks stay with the completed original.
- Both tasks share a chain. Clone carries `pushedFromId`, `chainRootId`, `pushCount + 1`.
- Task row shows `Pushed N×` bottom-right (count only, no date).
- Triggers: right-click checkbox, "Push…" in the context menu, and a button in the detail drawer.
- Original timeline records reason + destination date.
- Push **suppresses** that occurrence's normal recurrence generation; the clone retains repeat settings.
- Pushed completions **do count** toward heatmap and reps (effort evidence) and are marked distinctly in history.
- Un-completing a pushed original deletes the clone if untouched; if the clone has activity, warn and leave it.
- Pushing a **roadmap step** does **not** tick the step: `roadmapOrder` moves to the clone; the original remains completed history.

### Task detail + subtasks
- Task detail is a **right-side drawer**, opened by clicking the task title.
- Contents: description, embedded checklist, project + goal, dates, time spent, activity timeline.
- Timeline: created, scheduled, pushed (reason/date), completed/uncompleted, edits.
- Subtasks are **embedded checklist rows**, not first-class tasks: no dates, no independent push, never appear in day lists. Parent row shows `2/5`.
- Completing with open subtasks shows an inline warning but does not block.

### Heatmap
- Existing heatmap (`frontend-next/components/Heatmap.js`) must count **only `longTerm` tasks**. Short-term completions never appear, period.
- Skill occurrences get a **per-skill heatmap only**; they do **not** feed the global heatmap.

### Goals
- New `Goal` entity, independent of projects. A task may link to **one** goal (`goalId`) and still has a project.
- Linking a task to a goal **auto-sets `longTerm = true`**. Unlinking does not auto-clear it.
- Progress modes (per goal, switchable):
  - **Metric**: `current / target / unit`, updated by hand.
  - **Roadmap**: an ordered, editable list of steps; each step **is a task** with `roadmapOrder`. No date = backlog; dated = normal day-to-day task. Completing a step updates progress. Progress = completed steps / total steps.
  - **Reps**: optional target; every completed goal-linked task adds 1. Bar only if a target exists, otherwise a raw count.
- Switching away from roadmap keeps the steps as a hidden draft (no prompt). Switching back restores them. If the goal is completed while in another mode, delete only **undated, incomplete** roadmap steps; dated/completed steps remain as normal goal tasks.
- Goal completion is **manual**, with a nudge when target is met or all steps are done. Completed goals are archived and can be reopened.
- Goals appear in other views via a slim **Today strip**: only goals with at least one task today; shows name, progress, task count; clicking opens the goal. Hidden when no goal work today.
- Skill = `Goal.kind = SKILL`; no separate skill model, no levels/XP.

### Skills
- Separate **Skills** sidebar view; skill summaries appear nowhere else.
- Logging an occurrence happens **only in the Skills view** ("+1 occurrence"), never as a day-to-day task.
- Occurrence fields: date (default today), **duration in minutes**, **performance rating 1–5**. Both duration and rating required.
- Skill detail: all-time count, per-skill heatmap, occurrence list (editable/deletable).

### Centralization
- Recurrence moves into the backend so frontend and MCP share one implementation. No scheduler needed: next occurrence is generated on completion.
- MCP reaches full parity: push, detail/subtasks, goals, roadmap, skills.

---

## 2. Data model changes

`backend-springboot/src/main/java/com/myapp/todo/TodoItem.java`
- Add: `description TEXT`, `createdAt`, `completedAt`, `goalId`, `roadmapOrder`, `chainRootId`, `pushedFromId`, `pushCount`.
- `assignedTime` is scheduled time only; completion must not overwrite it.
- `longTerm` keeps its current meaning: "counts toward growth".

New entities/tables:
- `TaskEvent` — taskId, type (`CREATED|COMPLETED|UNCOMPLETED|PUSHED|EDITED`), detail, fromDate, toDate, createdAt.
- `Subtask` — taskId, title, done, sortOrder.
- `Goal` — title, kind (`GOAL|SKILL`), mode (`METRIC|ROADMAP|REPS`), metricCurrent, metricTarget, metricUnit, repsTarget, status, createdAt, completedAt.
- `SkillOccurrence` — goalId (skill), date, durationMinutes, rating, createdAt.

Migration: SQLite + Hibernate `ddl-auto=update` adds columns/tables. `LegacyDataBackfill` fills `createdAt`/`completedAt` (from the legacy completion time in `assignedTime`) and creates baseline `CREATED`/`COMPLETED` events for pre-existing rows. Backup prod DB before deploy. No Flyway.

---

## 3. Ordered steps (verify after each)

### [x] Step 1 — Heatmap honesty fix
Files: `frontend-next/components/Heatmap.js`.
- Global heatmap counts only `longTerm` completions.
- Refactored to accept an optional `tasksByDate` prop for reuse per skill.
Verify: short-term completions do not change intensity; longTerm ones do; Calendar header heatmap still renders.

### [x] Step 2 — Backend foundation: stable IDs + timestamps
Files: `TodoItem.java`, `TodoService.java`, `TodoRestController.java`, `LegacyDataBackfill.java`, `frontend-next/contexts/TaskContext.js`, `frontend-next/components/CreateTaskPopup.js`, `frontend-next/service.js`.
- Added `description`, `createdAt`, `completedAt`; completion sets `completedAt` and leaves `assignedTime` alone.
- Edit flow updates in place via `POST /todo/patch/{id}` so task IDs stay stable.
- `LegacyDataBackfill` backfills legacy rows.
Verify: edit a task → ID unchanged; complete a task → scheduled time preserved, completion timestamp set; tests pass.

### [x] Step 3 — Task detail drawer + activity timeline
Files: new `TaskEvent` entity/service/controller (backend), new `frontend-next/components/TaskDetailDrawer.*`, `MainView.js`, `TaskContext.js`, `ToDoDay.js`, `TodayView.js`, `service.js`.
- Right-side drawer opens from the task title.
- Shows description (editable, saves on blur), project, dates, time spent, timeline.
- Records created/completed/uncompleted/edited events. Push events arrive in Step 5.
Verify: notes persist across reload; timeline is ordered; drawer can stay open while editing the list.

### [x] Step 4 — Embedded subtasks
Files: new `Subtask` entity/service/controller; `TaskDetailDrawer`, `TodayView.js`, `ToDoDay.js`.
- Checklist CRUD + reorder; `n/m` badge on the task row.
- Completing a parent with open subtasks shows an inline warning but proceeds.
Verify: checks persist; badge is correct; subtasks never appear in day lists.

### [ ] Step 5 — Push + clone
Files: `TodoItem.java`, new `POST /todo/push`, `TodoService`, `TaskEvent`, frontend task row/menu/drawer, `mcp/src/tools/write.js`.
- Atomic endpoint: complete original, record reason/date, create clone, copy fields + unchecked subtasks, inherit chain.
- Popup with required reason, date picker default `+3`, quick chips.
- Triggers: right-click checkbox, context menu, drawer button.
- `Pushed N×` badge.
- Suppress recurrence for the pushed occurrence.
- Uncomplete cascade: delete untouched clone, warn otherwise.
Verify: reason/date recorded; clone correct; badge increments on repeated pushes; no duplicate recurring task; heatmap and reps count the pushed completion; roadmap step does not tick (verified in Step 8).

### [ ] Step 6 — Server-side recurrence centralization
Files: `TodoService.java` completion path, `frontend-next/hooks/useTaskManagement.js`, `mcp/src/tools/write.js`, `mcp/src/recurrence.js`.
- Generate next occurrence in the backend on completion; duplicate check in DB.
- Remove frontend + MCP recurrence generation; MCP `complete_task` just calls the backend.
- Preserve push suppression.
Verify: all four repeat patterns work with the frontend closed; no duplicates; MCP parity.

### [ ] Step 7 — Goals core (metric + reps)
Files: new `Goal` entity/service/controller; `TodoItem.goalId`; `Sidebar.js`, `MainView.js`, new `GoalsView`/`GoalDetail`; `TodayView.js`; `CreateTaskPopup.js`.
- Goal CRUD, mode switching, archive/reopen.
- Goal selector in the task popup; selecting a goal sets `longTerm = true`.
- Metric editor and reps counter.
- Goals cards with progress; goal detail with linked tasks.
- Today strip: only goals with tasks today.
Verify: link task → longTerm + heatmap; reps increment; strip shows/hides correctly; metric updates.

### [ ] Step 8 — Roadmap mode
Files: `GoalDetail`, `TodoItem.roadmapOrder`, `TodoService`, `Upcoming.js`/`CalendarView.js` drag support, `TaskEvent` (mode changes).
- Ordered roadmap list; add/rename/reorder/delete steps; date picker; drag to schedule.
- Progress = completed steps / total steps.
- Draft behavior on mode switch; cleanup on completion.
- Push moves `roadmapOrder` to the clone.
Verify: undated steps stay out of day lists; dated steps appear and drag normally; mode switching preserves/restores; pushed step stays pending; completion cleanup rules hold.

### [ ] Step 9 — Skills
Files: new `SkillOccurrence` entity/service/controller; new `SkillsView`/`SkillDetail`; `Sidebar.js`, `MainView.js`; reuse `Heatmap`.
- Skills only in the Skills view; no Today strip, no task link.
- "+1 occurrence" form: date, duration, rating 1–5 (required).
- Skill detail: count, per-skill heatmap, occurrence list with edit/delete.
Verify: occurrences persist; per-skill heatmap updates; global heatmap unaffected; skills absent from Today/Upcoming.

### [ ] Step 10 — MCP parity, docs, prod
Files: `mcp/src/tools/*`, `mcp/AGENT.md`, `backend-springboot/AGENT.md`, `frontend-next/AGENT.md`, root `AGENT.md`.
- Add MCP tools: `push_task`, subtask ops, goal CRUD, roadmap ops, `log_skill_occurrence`, description updates.
- Backup prod DB, run `./update-prod.sh`, verify service + heatmap + a live push/goal/skill.
Verify: MCP tools against dev backend; prod smoke test; docs updated.

---

## 4. Pinned / out of scope
- Skill levels, XP, drills, detailed progression.
- Nested roadmaps and promoting checklist rows into first-class tasks.
- Multi-user/auth.
- A mobile-specific push gesture (the context menu and drawer cover it).

## 5. Risks
- **Prod SQLite**: `ddl-auto=update` is the only migration path; backup before deploy and verify backfill.
- **Duplicate recurrence**: until Step 6, frontend and MCP both generate recurrences; push suppression must be implemented in both paths in Step 5, then removed in Step 6.
- **Heatmap semantics**: `completedTasks` is grouped by task date; pushed/rolled tasks count on the date of the completed attempt.
