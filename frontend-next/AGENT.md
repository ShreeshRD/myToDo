# Frontend (Next.js)

## Purpose

Own all Next.js frontend code: components, contexts, hooks, utilities, app router pages, and styling.

## Ownership

All files under `frontend-next/`.

## Local Contracts

- Next.js App Router (`app/` directory)
- TypeScript for new files; JavaScript for existing
- Context-based state management (`TaskContext`, `UIContext`, `StopwatchContext`)
- Data access through `lib/agentClient.ts`: tries the agent-app actions first (`NEXT_PUBLIC_AGENT_URL`, e.g. `http://localhost:8080`), then falls back to direct REST with the Spring Boot backend (`service.js` + `lib/constants.js`)
- Tests in `__tests__/` using Jest
- Recurring tasks: the backend creates the next occurrence on completion; `updateField` resolves to the backend's `{ status, item, nextItem }` and `useTaskManagement.updateTask` adds `nextItem` to the view. Never create occurrences in the frontend

## Work Guidance

- New components: place in `components/`, add to the closest parent that renders them
- New contexts: add to `contexts/`, document in `lib/registry.tsx` if global provider
- New hooks: add to `hooks/`
- New utilities: add to `lib/`
- Styling: all colours, radii, spacing, shadows and motion come from the design tokens in `styles/tokens.scss` (spec: `plan/design-system.md`). Themes switch with `<html data-theme="light|dark|glass">` (set by `hooks/useUIState.js`), so use `var(--token)` and avoid per-theme `.dark` / `.glass` overrides. MUI widgets follow the tokens through `components/MuiThemeBridge.js`. Scope component styles to the component's root class; never style bare elements (`li`, `button`) globally
- Task checkbox: `CustomCheckbox` with `priority={task.priority}` renders the design-system priority ring; project colours come from `lib/projectColors.js`
- Reminders: a task reminds at `taskDate + assignedTime − reminderMinutesBefore` (`lib/reminders.js`). `components/ReminderCenter.js` + `hooks/useReminders.js` fire an in-app toast and, when permitted, a desktop notification while a tab is open; fired reminders are remembered in `localStorage` (`reminders-fired`). Browsers cannot notify for closed tabs without a push server, so Android is the always-on path
- Cross-day drag-and-drop and same-day reorder logic live in component + `lib/dateHelpers.js`
- Agent chat panel: `MainView.js` renders an iframe (`src` = `NEXT_PUBLIC_AGENT_URL`) in an `agent-sidebar` aside, toggled by the floating "Ask AI" FAB (`#agent-fab`); both are only rendered when `NEXT_PUBLIC_AGENT_URL` is set
- Page context contract: `MainView.js` sends `{ view, selectedTaskId, selectedDate, filters }` whenever route/popup changes — via `setPageContext()` in `lib/agentClient.ts` (PUT to agent-app `/_agent-native/application-state/page-context`) and a `agentNative.setChatContext` postMessage that pre-fills the iframe composer; the agent reads it back with the `view-screen` action in `agent-app/`
- Agent confirmation flows: mutating agent actions (`deleteTask`, `updateTask`, `saveScratchpad`) now require human approval inside the agent chat panel (framework `needsApproval`); the embeddable chat UI renders an Approve affordance for these calls

## Ports

- Dev & Prod: **3001** (`-p 3001` in `package.json`)

## Commands

- **Dev (watch):** `cd frontend-next && npm run dev`        (port 3001)
- **Dev (default port):** `cd frontend-next && npx next dev`
- **Build (static export):** `cd frontend-next && npm run build`
- **Prod run (standalone):** `cd frontend-next && npm start`

## Verification

- `cd frontend-next && npm run lint`
- `cd frontend-next && npm run test` (17/17) and `npm run test:integration` (24/24 incl. integration)

## Child DOX Index

None
