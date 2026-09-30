# Agent-Native App (`agent-app`)

## Purpose

Own the Agent-Native application skeleton, runtime, chat UI, memory, and actions that coordinate tasks between the Next.js frontend (`frontend-next`) and the Spring Boot backend (`backend-springboot`).

## Ownership

All files under `agent-app/`.

## Local Contracts

- **Database boundary**: Uses an isolated local SQLite database at `agent-app/data/app.db` for development. Any integration with the Spring Boot backend must flow through actions invoking REST API endpoints (e.g., using `fetch`).
- **Audit logging**: Every mutating action (`createTask`, `updateTask`, `deleteTask`, `saveScratchpad`) must call `auditLog` (`actions/lib/audit.ts`) on both success and error outcomes. Records are written to the `action_audit_log` table in `data/app.db` (created idempotently on first use, migrated in place for pre-actor dev DBs). Entries capture the resolved session email (`ctx.userEmail`) as `actor` when available. Read-only actions (`listTasks`, `getScratchpad`) must NOT call it. Audit failures are swallowed and never block an action response.
- **Authorization**: The Spring Boot backend has no user/permission model, so there are no domain permission checks to enforce. Action routes rely on the framework's authenticated-owner default (`requiresAuth`) and the audit log records the acting session email when one exists.
- **Access control**: Follow user-tenant boundary rules for actions.
- **Port Mapping**: Dev server on `http://localhost:8080` (Agent-Native default). Spring Boot backend on `http://localhost:8000` (dev) / `5555` (prod); override with `BACKEND_URL` in `.env`.
- **TypeScript toolchain**: `tsconfig.json` extends `@agent-native/core/tsconfig.base.json` but overrides `ignoreDeprecations` to `"5.0"`. The framework base uses `"6.0"`, which the editor LSP (bundled TS 5.9.x) rejects; the project's TS 7.0.2 accepts both. Keep `"5.0"` until the LSP bundles a TS that accepts `"6.0"`.
- **Backend encoding**: `/todo/add` and `/todo/update` bind Spring `@RequestParam`, so actions pass values via `callBackend({ query })` (URL params); `/todo/scratchpad` stores the raw request body, so `saveScratchpad` uses `rawBody`. Never send those as a JSON `body`.
- **Framework checkout**: `@agent-native/core` and `@agent-native/toolkit` are `link:` dependencies on `../agent-native/packages/*`. The repo-root `agent-native/` is a gitlink (commit `40982a7f`) with no `.gitmodules`, so it is empty after a clone. Before `pnpm install`, clone the agent-native framework into `agent-native/` and check out that commit (`git -C agent-native checkout 40982a7f`), then install its workspace (`pnpm install` inside `agent-native/`).
- **MCP / external-agent surface**: The framework auto-mounts `/mcp`; the curated todo surface is defined in `server/lib/mcp-config.ts` and pinned by `actions/mcp-exposure.spec.ts`. Only read-only actions (`listTasks`, `getScratchpad`) are directly callable by authenticated external callers (`publicAgent: { expose, readOnly, requiresAuth: true }` on the action + `connectorCatalog`). Mutating actions are never advertised: `externalAgents.writes: "ask_app_only"` routes writes through the agent loop's approval flow and `denyActions` blocks every mutation as defense-in-depth. Any new action must be classified there before merge; do not add mutating actions to the direct-callable surface.

## Work Guidance

- To add a new action, create a file under `actions/` named after the operation (e.g., `listTasks.ts`).
- Define schema using Zod validation.
- Reference package imports from local `@agent-native/core` and `@agent-native/toolkit` packages.
- Mutating actions must wire `auditLog` from `actions/lib/audit.ts` into both the error and success paths.

## Verification

- Typecheck: `pnpm run typecheck` (exit 0)
- Tests: `pnpm run test` (framework checkout required). The dependency-free specs (`actions/lib/audit.spec.ts`, `actions/lib/backendClient.spec.ts`, 7 tests) also run standalone with `vitest --config vitest.audit.config.ts`
- Linter/formatting: `pnpm exec oxfmt --check .` inside `agent-app/`
- Dev server: `pnpm run dev` — expect Vite ready on `http://localhost:8080` and `curl http://localhost:8080/` returning HTTP 200 with the app title.

All checks use `pnpm`. The package manager is pinned to `pnpm@10.29.1` in `package.json`. If `pnpm` is not on `$PATH`, use `npx pnpm@10.29.1`.

### Dev server walkthrough (agent server verification)

1. Boot: `npx pnpm@10.29.1 --dir agent-app run dev` (or `pnpm run dev` inside `agent-app/`). Expect `VITE ... ready` and `Local: http://localhost:8080/`.
2. Confirm: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` returns `200` and the page `<title>` is `Chat - Open Source AI app starter with actions`.
3. Functional action checks live in the unit tests (`pnpm run test`, 26/26); actions run in-process through the agent runtime, so there is no HTTP endpoint to probe.
4. MCP surface check (Phase 7): with the dev server running, `python3 verify-mcp.py` probes `/mcp` over JSON-RPC — expect initialize OK (title "Todo"), tools/list showing exactly the read-only actions plus framework builtins (`ask_app`, etc.), no mutating tool listed, direct `deleteTask` rejected as "Unknown tool", and `listTasks` dispatching through the action stack (a `fetch failed` response head is expected when the Spring backend is not running and itself proves dispatch works). Run server + probe inside one terminal invocation: start `pnpm run dev` in the background, poll `http://localhost:8080/` until 200, run the probe, then kill the server; detached servers do not survive between terminal sessions.

Known environment gotchas (verified 2026-08-09):

- Node must be v24.x (`agent-native/.nvmrc` pins v24.14.0). If `better-sqlite3`'s native binary was built for another ABI (e.g. `NODE_MODULE_VERSION 147` vs required `137`), the Nitro dev worker crashes on DB migration (`[db] Migration failed: ... compiled against a different Node.js version`) and every request returns HTTP 500 even though Vite reports "ready". Fix: rebuild from source against the current Node —
  `cd agent-native/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && rm -rf build && npm_config_build_from_source=true npx --no-install node-gyp rebuild --release`
  The pnpm store can reuse a stale binary after reinstall, so repeat this if the ABI error recurs.
- Startup noise that is safe to ignore: the one-time `Failed to load url .../nitro/dist/runtime/internal/vite/dev-entry.mjs` error at boot, the `rollupOptions`/`rolldownOptions` warning, and `Tests closed successfully but something prevents Vite server from exiting` in test output (exit code stays 0).
- `typecheck` prints production-config errors (`BETTER_AUTH_SECRET`, persistent `DATABASE_URL`) but exits 0; those only matter for production deploys, not local dev on SQLite.

## Child DOX Index

None
