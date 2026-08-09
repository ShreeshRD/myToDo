# Agent-Native Conversion Plan

## Purpose

Provide a step-by-step, machine-followable plan for converting the existing `frontend-next` + `backend-springboot` app into an agent-native application, using the cloned `agent-native/` framework in the repo root.

The plan assumes:
- Existing app structure:
  - `frontend-next/` (Next.js, App Router)
  - `backend-springboot/` (Spring Boot, REST API, SQLite)
- Agent-Native framework cloned into `agent-native/` at the repo root.
- Ports per root DOX: frontend on 3001, backend dev on 8000, backend prod on 5555.

The agent must update AGENTS.md files as contracts per DOX rules when scopes, workflows, or durable behaviors change.

---

## Phase 0 – Read DOX and Establish Context

1. **Read DOX chain**
   - Open `AGENTS.md` at repo root and read it fully.
   - Open `frontend-next/AGENTS.md` and `backend-springboot/AGENTS.md` and read them fully.
   - Confirm ports, ownership scopes, and contracts.

2. **Confirm agent-native clone**
   - Verify that `agent-native/` exists at the repo root and is an unmodified clone of <https://github.com/BuilderIO/agent-native/>.
   - Do not edit files inside `agent-native/` until a later phase that explicitly allows it.
   - Treat `agent-native/` as an external framework and reference implementation during initial integration.

3. **Create plan folder contracts**
   - If not present, create `plan/AGENTS.md` as described in root DOX Child DOX Index, with scope: "Implementation plans, flow analysis, project docs".
   - Record that `plan/` will contain conversion plans, diagrams, and future architecture notes.
   - Add this `PLAN-agent-native.md` file to `plan/AGENTS.md` Child DOX Index as a durable plan document.

---

## Phase 1 – Inventory Existing Domain Operations

Goal: identify the main user-facing capabilities that will become Agent-Native Actions.

1. **Backend inventory**
   - In `backend-springboot/`, list all controllers in `com.myapp.todo` (e.g., `TaskController`, `UserController`).
   - For each controller method, record:
     - HTTP method and path (e.g., `GET /tasks`, `POST /tasks`).
     - Request and response DTOs or entities.
     - Side effects (DB writes, external calls).
   - Store the inventory in `plan/backend-endpoints.md`.

2. **Frontend inventory**
   - In `frontend-next/`, list all pages under `app/` and all major components under `components/`.
   - For each page, record:
     - The main user task (e.g., "view tasks", "create task", "edit task").
     - Which backend endpoints it calls (from data fetching hooks or utilities).
   - Store the inventory in `plan/frontend-flows.md`.

3. **Define candidate actions**
   - Based on backend + frontend inventories, create `plan/actions-candidates.md` listing 10–20 core operations, such as:
     - `list_tasks`
     - `create_task`
     - `update_task`
     - `delete_task`
     - `complete_task`
   - For each candidate, specify:
     - Input shape (fields; reference existing DTOs).
     - Output shape (fields; reference existing responses).
     - Required permissions (e.g., authenticated user, role).

4. **Update DOX for new docs**
   - Update `plan/AGENTS.md` Child DOX Index to include: `backend-endpoints.md`, `frontend-flows.md`, `actions-candidates.md`.

---

## Phase 2 – Set Up Agent-Native App Skeleton

Goal: create an initial Agent-Native app that can run alongside the existing frontend and backend.

1. **Inspect agent-native templates**
   - Inside `agent-native/`, open `README.md` and `PRODUCT.md` to understand concepts: Actions, agent runtime, skills, and templates.
   - Review `apps/email-automation-console`, `apps/chat`, or other templates to see how Agent-Native defines actions with `defineAction` and wires them into UI and agent surfaces.

2. **Create a new Agent-Native app directory**
   - Choose a name: e.g., `agent-app/` at repo root.
   - Use the Agent-Native CLI pattern documented in `README.md` and `docs/` as guidance, but instead of running `npx @agent-native/core create`, copy a minimal template from `agent-native/apps/chat` or `agent-native/examples` into `agent-app/`.
   - Ensure `agent-app/` has:
     - A `package.json` that depends on `@agent-native/core`.
     - A server entry (Nitro-compatible) and agent runtime wiring.
     - A basic chat UI (optional if you plan to embed later).

3. **Configure database and runtime**
   - Decide whether the Agent-Native app will share the Spring Boot DB or use its own SQL DB.
   - For initial conversion, choose a local SQL DB used by Agent-Native (e.g., SQLite or Postgres) and configure it via Drizzle as shown in `agent-native/registry/agent-native-app`.
   - Document the DB decision in `plan/runtime-db.md` and update `AGENTS.md` at root and `plan/AGENTS.md` with this contract.

4. **Add AGENTS.md for agent-app**
   - Create `agent-app/AGENTS.md` with:
     - Purpose: "Agent-Native app that orchestrates tasks for the todo system."
     - Ownership: all files under `agent-app/`.
     - Local Contracts: actions, agent runtime, DB config, integration with backend-springboot and frontend-next.
     - Work Guidance: how to add new actions.
     - Verification: agent-app tests and lint commands.
   - Link `agent-app/AGENTS.md` in root `AGENTS.md` Child DOX Index.

---

## Phase 3 – Define Shared Actions Layer

Goal: introduce a shared action layer in `agent-app/` that reflects existing backend operations.

1. **Create actions directory**
   - In `agent-app/`, create `actions/`.
   - For each candidate action from `actions-candidates.md`, create a file:
     - `actions/listTasks.ts`
     - `actions/createTask.ts`
     - etc.

2. **Implement actions using agent-native patterns**
   - For each action file, follow the `defineAction` pattern from `agent-native` examples.
   - Example structure:
     ```ts
     import { defineAction } from "@agent-native/core";
     import { z } from "zod";

     export default defineAction({
       schema: z.object({
         // fields matching backend DTOs
       }),
       run: async ({ input, actor, workspace }) => {
         // for now, call Spring Boot backend via HTTP
         // later, optionally call DB directly
       },
     });
     ```
   - Use Zod to match input validation to existing Java DTO validation rules.

3. **Wire actions to Spring Boot backend**
   - In each action’s `run`, call the corresponding Spring Boot REST endpoint using `fetch` or a shared HTTP client.
   - Respect backend ports from DOX: use dev port 8000 when `NODE_ENV=development`, prod port 5555 when `NODE_ENV=production`.
   - Handle auth tokens consistently with the existing frontend.

4. **Add authorization and audit**
   - Use Agent-Native’s recommended patterns (see `docs/`, `PRODUCT.md`, and example apps) to:
     - Derive `actor` identity from the session.
     - Check permissions before calling backend.
     - Log actions to an audit table in the Agent-Native DB.

5. **Register actions in agent runtime**
   - Locate the actions registration file used in templates (e.g., `agent-native.json` or a registry file).
   - Add entries for each new action so that the agent runtime can call them as tools.

6. **Update AGENTS.md**
   - In `agent-app/AGENTS.md`, document:
     - The actions directory and naming conventions.
     - The contract that all new agent-exposed work must go through actions.
   - In root `AGENTS.md`, note that a shared actions layer now exists in `agent-app/` for agent-native capabilities.

---

## Phase 4 – Connect Existing Frontend to Actions

Goal: begin moving `frontend-next` from calling backend directly to calling the shared actions, where appropriate.

1. **Create a frontend client for actions**
   - In `frontend-next/lib/`, add `agentClient.ts` that:
     - Exposes functions like `listTasks`, `createTask`.
     - Internally calls Agent-Native HTTP endpoints that map to actions (see `agent-native` HTTP exposure docs).
   - Maintain existing REST calls as fallback while migrating.

2. **Migrate a single high-value page**
   - Choose one page under `frontend-next/app/` (e.g., the main tasks list).
   - Replace its direct calls to `backend-springboot` endpoints with calls to `agentClient.ts`.
   - Verify that tasks load and mutations succeed.

3. **Add agent UI surface to frontend-next**
   - Add a sidebar or floating button that opens an agent chat panel.
   - The panel should:
     - Connect to the Agent-Native runtime in `agent-app/` (via WebSocket or HTTP streaming, per docs).
     - Provide context: current route, selected task IDs, filters.
   - Document the agent panel behavior in `frontend-next/AGENTS.md` Work Guidance.

4. **Pass page context to agent**
   - Define a JSON shape for context (route, selection, filters) and send it with each agent request.
   - Update an action or runtime hook in `agent-app/` to receive this context and use it for tool decisions.

5. **Verification**
   - Run `npm run lint` and `npm run test` in `frontend-next`.
   - Run Agent-Native’s test commands in `agent-app/`.

---

## Phase 5 – Introduce Agent Workflows

Goal: allow the agent to perform multi-step tasks in the todo domain.

1. **Define agent skills/jobs**
   - In `agent-app/`, inspect `skills/` or `jobs/` directories in Agent-Native repo for patterns.
   - Create domain-specific skills such as:
     - "Organize my tasks for today"
     - "Summarize overdue tasks"
     - "Create a plan to complete all tasks this week"
   - Implement skills using the defined actions.

2. **Configure memory and workspace**
   - Enable per-user workspaces in `agent-app` based on Agent-Native registry examples.
   - Attach agent memory (e.g., previous plans or summaries) so the agent can reference past interactions.

3. **Add confirmation flows**
   - Classify actions:
     - Read-only: no confirmation.
     - Mutating: require UI preview and user confirmation in `frontend-next` before performing.
   - Implement confirmation in the agent chat UI: show a summary of intended changes and an "Approve" button.

4. **Document workflows**
   - In `plan/agent-workflows.md`, describe at least 3 high-level workflows with:
     - Trigger phrase.
     - Actions called.
     - Expected side effects.

5. **Update DOX**
   - Update `agent-app/AGENTS.md` and `frontend-next/AGENTS.md` to reflect agent workflows and confirmation rules.

---

## Phase 6 – Gradual Backend Refactor (Optional)

Goal: optionally move some business logic from Spring Boot into Agent-Native directly, while keeping contracts stable.

1. **Identify candidate logic**
   - From `backend-endpoints.md`, pick endpoints where the logic is simple CRUD and can be reproduced in Node + SQL.

2. **Mirror entities in Agent-Native DB**
   - Using Drizzle, define tables that mirror `todo.db` JPA entities.
   - Implement actions that read/write directly to these tables instead of calling Spring Boot.

3. **Switch traffic gradually**
   - For a chosen endpoint (e.g., `list_tasks`), change `agent-app` actions to use the new DB.
   - Keep Spring Boot as the source of truth for other endpoints.

4. **Keep frontend stable**
   - Since `frontend-next` now calls actions via `agentClient.ts`, the underlying implementation can change without affecting the UI.

5. **Document refactor**
   - Update `plan/backend-refactor.md` and relevant AGENTS.md files to record which endpoints are now handled by Agent-Native DB and which remain in Spring Boot.

---

## Phase 7 – MCP and External Agent Exposure

Goal: expose a safe subset of actions as MCP tools for external agents.

1. **Review agent-native MCP docs**
   - In `agent-native/`, open `.claude-plugin/`, `.claude`, or other MCP-related files to understand how actions are exported as MCP tools.

2. **Define MCP tool subset**
   - From `actions-candidates.md`, choose only low-risk actions (e.g., `list_tasks`, `summarize_tasks`).
   - Avoid destructive or high-risk actions at first.

3. **Configure MCP manifest**
   - Create or update an MCP manifest file (e.g., `agent-native.app-skill.json` analog) in `agent-app/` that maps actions to tools.

4. **Test with external clients**
   - Use Claude or other MCP-compatible clients to call tools and verify they operate correctly.

5. **Update DOX**
   - In root `AGENTS.md`, record that MCP tools now exist and note the subset and safety rules.

---

## Phase 8 – Verification and Closeout

1. **Repository-wide checks**
   - Run backend tests: `cd backend-springboot && ./mvnw test`.
   - Run frontend tests and lint: `cd frontend-next && npm run test && npm run lint`.
   - Run agent-app tests and lint based on its `package.json`.

2. **User-level manual tests**
   - Verify that a user can:
     - Use the app as before (task CRUD).
     - Open the agent panel and ask it to list or summarize tasks.
     - Approve an agent proposal to create or update tasks.

3. **Update AGENTS.md chain**
   - For every folder touched (`frontend-next/`, `backend-springboot/`, `agent-app/`, `plan/`), perform a DOX pass:
     - Ensure Purpose, Local Contracts, Work Guidance, and Verification reflect the new agent-native behavior.
     - Update Child DOX Index entries for new documents.
     - Remove stale statements (e.g., "frontend only calls backend" if actions now exist).

4. **Record open work**
   - In `plan/open-items.md`, list remaining tasks (e.g., more pages to migrate to actions, more endpoints to refactor, more MCP tools to expose).

---

## Execution Notes for an AI Agent

- Always re-read the relevant AGENTS.md chain before editing a folder.
- Prefer adding new behavior via Agent-Native actions rather than direct UI or backend changes.
- Keep the existing app usable throughout; avoid breaking current flows when introducing agent-native components.
- Update plan documents and AGENTS.md files whenever scopes, workflows, or durable behaviors change.