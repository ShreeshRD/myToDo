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

## Work Guidance

- To add a new action, create a file under `actions/` named after the operation (e.g., `listTasks.ts`).
- Define schema using Zod validation.
- Reference package imports from local `@agent-native/core` and `@agent-native/toolkit` packages.
- Mutating actions must wire `auditLog` from `actions/lib/audit.ts` into both the error and success paths.

## Verification

- Typecheck: `pnpm run typecheck` (exit 0)
- Tests: `pnpm run test` (19/19 pass)
- Linter/formatting: `pnpm exec oxfmt --check .` inside `agent-app/`
- Dev server: `pnpm run dev` — expect Vite ready on `http://localhost:8080` and `curl http://localhost:8080/` returning HTTP 200 with the app title.

All checks use `pnpm`. The package manager is pinned to `pnpm@10.29.1` in `package.json`. If `pnpm` is not on `$PATH`, use `npx pnpm@10.29.1`.

### Dev server walkthrough (agent server verification)

1. Boot: `npx pnpm@10.29.1 --dir agent-app run dev` (or `pnpm run dev` inside `agent-app/`). Expect `VITE ... ready` and `Local: http://localhost:8080/`.
2. Confirm: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` returns `200` and the page `<title>` is `Chat - Open Source AI app starter with actions`.
3. Functional action checks live in the unit tests (`pnpm run test`, 19/19); actions run in-process through the agent runtime, so there is no HTTP endpoint to probe.

Known environment gotchas (verified 2026-08-09):
- Node must be v24.x (`agent-native/.nvmrc` pins v24.14.0). If `better-sqlite3`'s native binary was built for another ABI (e.g. `NODE_MODULE_VERSION 147` vs required `137`), the Nitro dev worker crashes on DB migration (`[db] Migration failed: ... compiled against a different Node.js version`) and every request returns HTTP 500 even though Vite reports "ready". Fix: rebuild from source against the current Node —
  `cd agent-native/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && rm -rf build && npm_config_build_from_source=true npx --no-install node-gyp rebuild --release`
  The pnpm store can reuse a stale binary after reinstall, so repeat this if the ABI error recurs.
- Startup noise that is safe to ignore: the one-time `Failed to load url .../nitro/dist/runtime/internal/vite/dev-entry.mjs` error at boot, the `rollupOptions`/`rolldownOptions` warning, and `Tests closed successfully but something prevents Vite server from exiting` in test output (exit code stays 0).
- `typecheck` prints production-config errors (`BETTER_AUTH_SECRET`, persistent `DATABASE_URL`) but exits 0; those only matter for production deploys, not local dev on SQLite.

## Child DOX Index

None
