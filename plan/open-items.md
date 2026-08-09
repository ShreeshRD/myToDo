# Open Items

Tracked here so work is never silently lost between phases. Phase 8 will close
out remaining items.

## agent-app pnpm conversion and dev server

- **Status**: Resolved ✅
- **Resolution**: `agent-app` converted to pnpm (`pnpm@10.29.1`, `link:` protocol deps, exact pins matching the framework lockfile). Two symlink shims for `@assistant-ui/core` / `assistant-stream` added under the framework's untracked `node_modules`. `pnpm run typecheck` → exit 0; `pnpm run test` → 19/19 pass.
- **better-sqlite3 native binary**: The `.pnpm` store copy of `better-sqlite3@12.11.1` had no compiled `.node` file (postinstall was skipped). Fixed by running `node-gyp rebuild` directly in `agent-native/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/`. This is an untracked file in `agent-native/` and must be re-run after a clean pnpm install of the framework.
- **Dev server**: Binds to `http://localhost:8080`. All 24 DB migrations apply cleanly on first boot. Dev auto-login is enabled.

## Audit coverage for future actions

- **Status**: Contract in place (`agent-app/AGENT.md`), verified for the four current mutating actions. Any new mutating action must add `auditLog` calls; a review pass is part of action reviews.

## Authorization decision (Phase 3)

- **Status**: Decided — no open work.
- The Spring Boot backend (`backend-springboot/`) has no user/permission model (no security config, no user entity), so there are no domain permission checks for actions to enforce. Phase 3 authorization therefore consists of: (1) framework authenticated-owner route default (`requiresAuth`) on action HTTP routes, and (2) audit attribution via the acting session email (`ctx.userEmail` → `actor` column). Revisit if the backend ever adds accounts/roles.
