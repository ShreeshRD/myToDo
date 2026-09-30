---
title: Project Overview & How to Run
scope: whole repo (backend-springboot, frontend-next, android, agent-app)
---

# myToDo — Project Overview & How to Run

myToDo is a personal task manager, modelled on a popular to-do app. It has day-by-day task lists, projects, priorities, recurring tasks and time-of-day reminders, plus a Notion-style scratchpad and per-task stopwatches.

It runs in three places:
- A web app.
- A native Android app that works offline and syncs.
- An optional AI agent that reads and edits tasks through chat.

## 1. Architecture

```
┌──────────────────────┐  REST (fallback)   ┌─────────────────────────┐
│ frontend-next :3001  │ ─────────────────▶ │ backend-springboot      │
│ Next.js static SPA   │                    │ :8000 dev / :5555 prod  │
└─────────┬────────────┘                    │ Spring Boot + SQLite    │
          │ actions (preferred)             │ source of truth,        │
          ▼                                 │ recurrence, sync API    │
┌──────────────────────┐  callBackend()     └──────▲────────────▲─────┘
│ agent-app :8080      │ ───────────────────────────┘            │
│ agent-native chat    │                    /todo/sync/* (LWW)   │
│ + MCP at /mcp        │                   ┌─────────────────────┴──┐
└──────────────────────┘                   │ android (Kotlin/Compose)│
                                           │ Room offline store,     │
                                           │ WorkManager, alarms     │
                                           └─────────────────────────┘
```

| Part | Path | Stack | Role |
|---|---|---|---|
| Backend | `backend-springboot/` | Spring Boot 3.4, Java 21, JPA, SQLite | Stores the data, creates next occurrences of recurring tasks, runs the sync API |
| Web app | `frontend-next/` | Next.js 16, React 19, SCSS design tokens | The full UI: one page whose views switch by state, not routes |
| Android app | `android/` | Kotlin, Jetpack Compose (Material 3), Room, WorkManager | Offline-first phone client with native reminders |
| Agent app | `agent-app/` | `@agent-native/core`, React Router, Vite, pnpm | AI chat over typed actions, plus an MCP server |
| Plans | `plan/` | Markdown | Design docs (`design-system.md`, `backend-endpoints.md`, …) |

**How the web app gets data.** It calls `lib/agentClient.ts`. That tries the agent-app actions first when `NEXT_PUBLIC_AGENT_URL` is set, and falls back to direct REST calls in `service.js`.

**How Android gets data.** It keeps its own Room database. When it can reach the server, it pushes local changes and pulls server changes. If the same task was changed on both sides, the most recent edit wins (compared by `updatedAt`).

## 2. What the app does

### Web views (sidebar)

| View | What it shows |
|---|---|
| Upcoming (default) | Day columns starting today, plus an Overdue column. Drag tasks to reorder them within a day or move them to another day; right-click a task for the context menu |
| Today | A timeline in 90-minute slots, placed by `assignedTime`. Also shows an "unscheduled" column, an overdue list and a current-time line |
| Calendar | Month grid with task chips coloured by priority. Click a day to open its task panel. A completion heatmap sits in the header, and an overdue pill shows the count |
| Search | Search by name, with filters (All / Completed / Active / Recurring / Project), sorting and paging |
| Scratchpad | Notion-like block editor: headings, to-dos and toggles from a `/` menu, draggable blocks, multi-select. Autosaves after you stop typing |

### Task features (web and Android)

- **Fields:** name, date, time of day, reminder, project, priority (P1–P4 shown as a coloured ring on the checkbox), and a repeat pattern (every N days, weeks or months, or specific weekdays).
- **Recurring tasks:**
  - When you complete a repeating task anywhere (web, agent or Android), the **backend** creates the next occurrence.
  - The next occurrence keeps the task's time and reminder.
  - If a task with the same name and project already exists on that date, no duplicate is created.
- **Reminders:** you can choose No reminder, At time of task, 5/10/15/30 min, 1 hour, or 1 day before. The option only appears once the task has a time.
  - **Web:** an in-app toast, plus a desktop notification if you allow them, while a tab is open. There's a "Mark done" action.
  - **Android:** native notifications from exact alarms, with a "Mark done" action. They fire even when the app is closed, and are rescheduled after reboot or a time-zone change.
- **Web extras:** stopwatch panel ("Time me"), in-progress and long-term flags, the project manager (reorder or delete projects), light, dark and glass themes, and the "Ask AI" agent panel.
- **Android screens:** Today (overdue, today, completed), Upcoming (grouped by date), Search, Settings (server URL, Sync now, sync status, theme, notification and exact-alarm permissions), and a bottom-sheet task editor. Swipe a task to complete or delete it, with undo.

### Design

Every web style comes from the tokens in `frontend-next/styles/tokens.scss`, and the Android theme mirrors them. The rules are in `plan/design-system.md`: neutral greys, one indigo accent, Inter, 6/10/14 px radii, and priority colours for the checkbox ring.

### Backend API

The `/todo` endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/todo/allbydate` | Tasks grouped by date, in date order |
| GET | `/todo/all` | Flat list of tasks (deleted tasks are hidden) |
| POST | `/todo/add` | Create a task. Params: `name`, `category`, `taskDate`, plus optional `priority`, `repeatType`, `repeatDuration`, `longTerm`, `assignedTime`, `reminderMinutesBefore` |
| POST | `/todo/update` | Change one field (`id`, `field`, `value`). Returns `{status, item, nextItem}` |
| DELETE | `/todo/delete/{id}` | Mark a task deleted (a tombstone, so sync clients hear about it) |
| GET / POST | `/todo/scratchpad` | Read or overwrite the scratchpad (raw JSON body) |
| GET | `/todo/sync/changes?since=` | Tasks changed after a cursor, including tombstones. Returns `{serverTime, items}` |
| POST | `/todo/sync/push` | Upload full task snapshots keyed by `uuid`; the most recent edit wins |

Full details are in `plan/backend-endpoints.md`.

### Agent app

Its actions, `listTasks`, `getScratchpad`, `createTask`, `updateTask`, `deleteTask` and `saveScratchpad`, go through `actions/lib/backendClient.ts`.
- The three that change data other than `createTask` need your approval in the chat.
- Every action that changes data is logged to `action_audit_log`.
- External agents that connect over MCP (`/mcp`) can only use the read-only actions.

## 3. How to run

### Prerequisites

| Tool | Needed for |
|---|---|
| Java 21, **or** Docker | Backend (commands for both below) |
| Node.js (recent LTS) | Web app |
| Docker | Android build, if there's no local Android SDK |
| Android Studio or `adb` (optional) | Installing the APK on a phone or emulator |
| Node v24 + `pnpm@10.29.1` + the `agent-native/` checkout | Agent app only. `agent-native/` is an empty gitlink after cloning; see `agent-app/AGENT.md` |

### Ports

| Service | Dev | Prod |
|---|---|---|
| Web app | 3001 | 3001 |
| Backend | 8000 | 5555 |
| Agent app | 8080 | — |

### Step 1: Backend

```bash
cd backend-springboot
./mvnw spring-boot:run                                   # :8000, ./todo.db
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev    # :8000, ./todo-dev.db

# No JDK 21? Docker instead (prod profile, :5555, data kept in the todo_data volume):
docker compose up -d --build
```

- On first start with an existing database, the backend adds the new columns (`uuid`, `updatedAt`, `deleted`, `reminderMinutesBefore`) and fills them in for old tasks.
- To open the web UI from another machine, set `APP_CORS_ALLOWED_ORIGIN_PATTERNS`.

### Step 2: Web app

```bash
cd frontend-next
npm install
npm run dev        # http://localhost:3001
```

`.env.development` points at `http://localhost:8000/todo`. If the backend runs in Docker on 5555, start the app with `NEXT_PUBLIC_BACKEND_URL=http://localhost:5555/todo npm run dev`.

### Step 3: Android app

```bash
cd android
docker/gradle.sh assembleDebug            # builds app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk   # or copy the APK to the phone
```

Then, on the phone:
1. Open **Settings** and enter the server URL, for example `http://192.168.1.20:5555` on your LAN, your Tailscale address, or `http://10.0.2.2:8000` from an emulator.
2. Allow notifications and exact alarms so reminders can fire.

The app also works with no server, as a local-only task list. More detail is in `android/README.md`.

### Step 4 (optional): Agent app

```bash
cp agent-app/.env.example agent-app/.env   # AUTH_DISABLED=true to skip login locally
npx pnpm@10.29.1 --dir agent-app install
npx pnpm@10.29.1 --dir agent-app run dev   # http://localhost:8080
```

### Production build

```bash
cd frontend-next && npm run build            # static export copied into backend static/ (replaces it)
cd ../backend-springboot && ./mvnw clean package
SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.1.5.jar   # :5555
```

`update-prod.sh` builds the jar if it's missing and copies it to the prod folder.

## 4. Tests and checks

| Where | Command | Count |
|---|---|---|
| Backend | `./mvnw test`, or in Docker: `docker run --rm -v "$PWD":/app -v "$HOME/.m2":/root/.m2 -w /app eclipse-temurin:21-jdk ./mvnw -B test` | 41 |
| Web app | `npm run lint` · `npm test` · `npx jest` (includes the integration tests) · `npm run typecheck` | 33 |
| Android | `docker/gradle.sh assembleDebug testDebugUnitTest lint` | 40 |
| Agent app | `pnpm test` (needs the framework checkout). The self-contained specs also run with `vitest --config vitest.audit.config.ts` | 7 self-contained |

Follow-up work is tracked in `plan/open-items.md`.

## 5. Known limits

- **Web reminders need an open tab.** Browsers can't show scheduled notifications for a closed tab without a push server. Android is the always-on path.
- **Android doesn't create recurring copies offline.** When you complete a repeating task on the phone, the next occurrence appears after the next sync, because only the server creates occurrences.
- **Sync trusts device clocks.** The most recent edit wins by device time, so a phone whose clock runs well behind the server can lose edits.
- **Editing a task on the web replaces it.** Saving creates a new task and deletes the old one, so the task's `uuid` changes. Sync handles this as a deletion plus a new task.
- **Deleted tasks are never removed.** The tombstones stay in the database; there's no cleanup yet.
- **The agent app depends on a manual framework checkout** in `agent-native/` before it can install or run.
