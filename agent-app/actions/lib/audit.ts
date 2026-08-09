/**
 * Lightweight audit logger for mutating Agent-Native actions.
 *
 * Writes a record to an `action_audit_log` table in the Agent-Native SQLite
 * database (`data/app.db`). The table is created on first use (idempotent DDL)
 * and migrated in place if an older dev DB lacks the `actor` column.
 *
 * Design notes:
 * - Uses @libsql/client directly, matching the same DB file as the framework.
 * - Read-only actions (listTasks, getScratchpad) should NOT call this.
 * - `actor` is the resolved session email passed from the action run context
 *   (`ctx.userEmail`); it is null when the call has no authenticated identity.
 * - Errors in audit logging are caught and logged to stderr so they never
 *   block a successful action response.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve relative to the agent-app root (two levels up from actions/lib/)
const DB_PATH =
  process.env.LIBSQL_URL ??
  `file:${path.resolve(__dirname, "../../data/app.db")}`;

let _clientPromise: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_clientPromise) {
    _clientPromise = createClient({ url: DB_PATH });
  }
  return _clientPromise;
}

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS action_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action_name TEXT    NOT NULL,
  input_json  TEXT    NOT NULL,
  outcome     TEXT    NOT NULL CHECK(outcome IN ('success', 'error')),
  error_msg   TEXT,
  actor       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)
`;

const COLUMN_CHECK_SQL = `PRAGMA table_info(action_audit_log)`;

const ADD_ACTOR_SQL = `ALTER TABLE action_audit_log ADD COLUMN actor TEXT`;

let _tableEnsured = false;

async function ensureTable(client: ReturnType<typeof createClient>) {
  if (_tableEnsured) return;
  await client.execute(ENSURE_TABLE_SQL);
  // Migrate dev DBs created before the actor column existed.
  const info = await client.execute(COLUMN_CHECK_SQL);
  const hasActor = info.rows.some((row) => row.name === "actor");
  if (!hasActor) {
    await client.execute(ADD_ACTOR_SQL);
  }
  _tableEnsured = true;
}

export interface AuditEntry {
  actionName: string;
  input: Record<string, unknown>;
  outcome: "success" | "error";
  errorMsg?: string;
  /** Resolved session email of the actor, when the call has one. */
  actor?: string;
}

/**
 * Write an audit entry. Safe to `await` — errors are swallowed so the calling
 * action is not affected by audit failures.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const client = getClient();
    await ensureTable(client);
    await client.execute({
      sql: `INSERT INTO action_audit_log (action_name, input_json, outcome, error_msg, actor)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        entry.actionName,
        JSON.stringify(entry.input),
        entry.outcome,
        entry.errorMsg ?? null,
        entry.actor ?? null,
      ],
    });
  } catch (err) {
    // Audit must never break the action — log to stderr and continue.
    console.error("[audit] Failed to write audit log entry:", err);
  }
}
