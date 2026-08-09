import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// audit.ts resolves its DB from process.env.LIBSQL_URL at module evaluation,
// so the env var must be set before the module is imported.
let dir: string;
let dbUrl: string;
let auditLog: typeof import("./audit").auditLog;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "agent-app-audit-"));
  dbUrl = `file:${path.join(dir, "audit-test.db")}`;
  process.env.LIBSQL_URL = dbUrl;
  ({ auditLog } = await import("./audit"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function readAuditRows() {
  const client = createClient({ url: dbUrl });
  try {
    const result = await client.execute(
      "SELECT action_name, input_json, outcome, error_msg, actor, created_at FROM action_audit_log ORDER BY id",
    );
    return result.rows;
  } finally {
    client.close();
  }
}

describe("auditLog", () => {
  it("creates the table on first use and writes a success entry with actor", async () => {
    await auditLog({
      actionName: "createTask",
      input: { name: "Ship audit logger", taskDate: "2026-08-09" },
      outcome: "success",
      actor: "user@example.com",
    });

    const rows = await readAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action_name: "createTask",
      outcome: "success",
      error_msg: null,
      actor: "user@example.com",
    });
    expect(JSON.parse(String(rows[0].input_json))).toEqual({
      name: "Ship audit logger",
      taskDate: "2026-08-09",
    });
    expect(String(rows[0].created_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("is idempotent across calls (reuses the table)", async () => {
    await auditLog({
      actionName: "updateTask",
      input: { id: 1, field: "complete" },
      outcome: "success",
    });
    await auditLog({
      actionName: "updateTask",
      input: { id: 1, field: "complete" },
      outcome: "success",
    });

    const rows = await readAuditRows();
    expect(rows).toHaveLength(3);
  });

  it("records error entries with the error message", async () => {
    await auditLog({
      actionName: "deleteTask",
      input: { id: 42 },
      outcome: "error",
      errorMsg: "Backend error 500 deleting task 42",
    });

    const rows = await readAuditRows();
    const last = rows[rows.length - 1];
    expect(last).toMatchObject({
      action_name: "deleteTask",
      outcome: "error",
      error_msg: "Backend error 500 deleting task 42",
    });
  });

  it("migrates a pre-actor table in place without losing rows", async () => {
    const oldDir = await mkdtemp(path.join(tmpdir(), "agent-app-audit-old-"));
    const oldUrl = `file:${path.join(oldDir, "old.db")}`;
    try {
      const client = createClient({ url: oldUrl });
      await client.execute(`CREATE TABLE action_audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        action_name TEXT    NOT NULL,
        input_json  TEXT    NOT NULL,
        outcome     TEXT    NOT NULL CHECK(outcome IN ('success', 'error')),
        error_msg   TEXT,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`);
      await client.execute({
        sql: `INSERT INTO action_audit_log (action_name, input_json, outcome) VALUES (?, ?, ?)`,
        args: ["legacy-action", "{}", "success"],
      });
      await client.close();

      vi.resetModules();
      process.env.LIBSQL_URL = oldUrl;
      const { auditLog: freshAuditLog } = await import("./audit");
      await freshAuditLog({
        actionName: "createTask",
        input: { name: "x" },
        outcome: "success",
      });

      const check = createClient({ url: oldUrl });
      const cols = await check.execute("PRAGMA table_info(action_audit_log)");
      expect(cols.rows.some((row) => row.name === "actor")).toBe(true);
      const rows = await check.execute(
        "SELECT actor FROM action_audit_log ORDER BY id",
      );
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows[0].actor).toBeNull();
      expect(rows.rows[1].actor).toBeNull();
      await check.close();
    } finally {
      await rm(oldDir, { recursive: true, force: true });
    }
  });
});
