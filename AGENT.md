# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

### Ports

| Service | Dev | Prod |
|---|---|---|
| Frontend (Next.js) | 3001 | 3001 |
| Backend (Spring Boot) | 8000 | 5555 |
| Agent-Native App | 8080 | — |

Frontend always runs on 3001. Backend dev runs on 8000, prod runs on 5555. Agent-Native dev server (`agent-app/`) runs on 8080 via `pnpm run dev`.

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index

| Domain | Path | Scope |
|---|---|---|
| Backend | `backend-springboot/AGENT.md` | Spring Boot REST API, services, data layer |
| Frontend | `frontend-next/AGENT.md` | Next.js components, contexts, hooks, utilities |
| Plan & Analysis | `plan/AGENT.md` | Implementation plans, flow analysis, project docs |
| Agent-Native App | `agent-app/AGENT.md` | Agent-Native runtime, actions, chat UI, DB config, integration with backend and frontend |

## Agent-Native Shared Actions Layer

A shared actions layer exists in `agent-app/actions/`. All agent-exposed
operations on the todo domain go through `defineAction` in that directory —
never via direct `/api/*` routes. The layer proxies to the Spring Boot backend
using `actions/lib/backendClient.ts`.

All mutating actions log success/error outcomes to the `action_audit_log`
table in `agent-app/data/app.db` via `actions/lib/audit.ts`; read-only actions
must not. Entries capture the acting session email (`actor`) when available.
The backend has no user/permission model, so authorization rests on the
framework's authenticated-owner route default (`requiresAuth`) rather than
domain permission checks.

Actions currently exposed to the agent runtime:

| Action | File | Backend Endpoint |
|---|---|---|
| `listTasks` | `agent-app/actions/listTasks.ts` | `GET /todo/allbydate` or `/todo/all` |
| `createTask` | `agent-app/actions/createTask.ts` | `POST /todo/add` |
| `updateTask` | `agent-app/actions/updateTask.ts` | `POST /todo/update` |
| `deleteTask` | `agent-app/actions/deleteTask.ts` | `DELETE /todo/delete/{id}` |
| `getScratchpad` | `agent-app/actions/getScratchpad.ts` | `GET /todo/scratchpad` |
| `saveScratchpad` | `agent-app/actions/saveScratchpad.ts` | `POST /todo/scratchpad` |
