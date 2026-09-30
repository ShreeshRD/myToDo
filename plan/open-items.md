# Open Items

Remaining work after the Agent-Native conversion (post Phase 8 closeout, 2026-08-26).

## Manual verification (from Phase 8 step 2)

- Use the app end-to-end as before: task CRUD in `frontend-next` (port 3001) against Spring Boot dev (port 8000).
- Open the agent panel in `agent-app` (port 8080) and ask it to list or summarize tasks.
- Approve an agent proposal that creates or updates tasks; confirm success/error rows land in the `action_audit_log` table of `agent-app/data/app.db`.

## Frontend

- Pagination styling in Search is unverified visually (seed data never exceeds one page).

## Android

- Never launched on a device or emulator in this environment (no SDK/emulator). Install `android/app/build/outputs/apk/debug/app-debug.apk` and verify: first-run server prompt, sync both ways with the web app, reminder notification + "Mark done", swipe complete/delete with undo, reboot rescheduling.
- Recurring next occurrences only appear after a sync (server-side recurrence by design).

## Backend

- Tombstones (`deleted=true`) are never purged.

## Actions / MCP surface

- Re-check `plan/actions-candidates.md` for candidate operations not yet exposed as actions; any new action must be classified in `agent-app/server/lib/mcp-config.ts` and pinned by `agent-app/actions/mcp-exposure.spec.ts`.
