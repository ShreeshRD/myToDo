# Runtime Database Decision

For the initial conversion to the Agent-Native architecture, we must define the database boundary between the existing Spring Boot backend and the new Agent-Native application (`agent-app`).

## Database Option Selected: Isolated Runtime SQLite

The Agent-Native app will run on its own **isolated SQLite database** (defaulting to `agent-app/data/app.db`), separate from the Spring Boot database (`backend-springboot/todo.db`).

### Rationale

1. **Isolation of Abstractions**:
   - The Spring Boot backend uses JPA/Hibernate to manage its SQLite schema.
   - The Agent-Native app uses Drizzle ORM to manage its schema (e.g., `application_state`, `sessions`, `settings`, `oauth_tokens`, etc.).
   - Running them against the same SQLite database file would lead to file locking conflicts, schema management collisions, and migration clashes.

2. **Access Patterns**:
   - For Phase 2, the Agent-Native app acts as a coordinator, storing its own agent session logs, chat history, and runtime state in its SQLite database.
   - Any access to task or domain data will flow through the Spring Boot REST API (Phase 3 actions) rather than direct database table sharing.
   - Later, if direct database access is needed, we can evaluate a shared database endpoint (e.g., Postgres or a replicated libSQL cluster).

3. **Ease of Local Development**:
   - Both applications can run concurrently in development mode without file locking errors on `todo.db`.

### Audit table

Phase 3 added an `action_audit_log` table in the Agent-Native DB (`agent-app/data/app.db`), written by `agent-app/actions/lib/audit.ts` via `@libsql/client` raw SQL (not Drizzle — the table is created idempotently on first use and migrated in place if an older dev DB lacks the `actor` column). All mutating actions log success/error outcomes and the acting session email there; see `agent-app/AGENT.md` Local Contracts.
