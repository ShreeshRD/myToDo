/**
 * agentClient — Thin proxy to the agent-app actions layer.
 *
 * Each function tries the agent-app first (`NEXT_PUBLIC_AGENT_URL`), then falls
 * back to the original service.js REST functions if the agent server is
 * unreachable or returns an error.
 */

import * as service from "../service";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "";
const ACTIONS_BASE = `${AGENT_URL}/_agent-native/actions`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * POST to `/_agent-native/application-state/<key>` to persist frontend context
 * so the agent's view-screen tool can read it back.
 */
export async function setPageContext(value: unknown): Promise<void> {
  if (!AGENT_URL) return;
  try {
    await fetch(`${AGENT_URL}/_agent-native/application-state/page-context`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  } catch {
    // Best-effort — silently ignore if agent is down
  }
}

/** Call an action via HTTP. Returns the parsed JSON result or throws. */
async function callAction<T>(
  actionName: string,
  method: "GET" | "POST" | "DELETE" | "PUT",
  payload?: Record<string, unknown>,
): Promise<T> {
  const url = `${ACTIONS_BASE}/${actionName}`;

  let response: Response;
  if (method === "GET") {
    const params = payload
      ? "?" + new URLSearchParams(
          Object.fromEntries(
            Object.entries(payload)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)]),
          ),
        )
      : "";
    response = await fetch(url + params, { method: "GET" });
  } else {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
  }

  if (!response.ok) {
    throw new Error(`Agent action ${actionName} failed: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// getTasks
// ---------------------------------------------------------------------------

/**
 * Fetch tasks.
 *
 * `more` mirrors the service.js convention:
 *   - "bydate"  → groupByDate=true  → returns `{ itemsByDate: {...} }`
 *   - ""        → groupByDate=false → returns flat array
 */
export async function getTasks(more = ""): Promise<unknown> {
  if (!AGENT_URL) return service.getTasks(more);

  try {
    const bydate = more.includes("bydate");
    const result = await callAction<{ tasks: unknown[] }>(
      "listTasks",
      "GET",
      { groupByDate: bydate },
    );

    if (bydate) {
      // Re-group into the { itemsByDate: { "YYYY-MM-DD": Task[] } } shape
      // that useTaskManagement.js expects.
      const grouped: Record<string, unknown[]> = {};
      for (const task of result.tasks) {
        const t = task as Record<string, unknown>;
        const date = (t["taskDate"] as string) ?? "unknown";
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
      }
      return { itemsByDate: grouped };
    }

    return result.tasks;
  } catch (err) {
    console.warn("[agentClient] getTasks falling back to service.js:", err);
    return service.getTasks(more);
  }
}

// ---------------------------------------------------------------------------
// addTask
// ---------------------------------------------------------------------------

export async function addTask(
  task: string,
  tdate: string,
  category = "None",
  priority = 0,
  repeatType = "NONE",
  repeatDuration = 0,
  longTerm = false,
): Promise<unknown> {
  if (!AGENT_URL) return service.addTask(task, tdate, category, priority, repeatType, repeatDuration, longTerm);

  try {
    const result = await callAction<{ task: unknown }>("createTask", "POST", {
      name: task,
      taskDate: tdate,
      category,
      priority,
      repeatType,
      repeatDuration,
      longTerm,
    });
    // createTask returns { task: {...} }
    return (result as { task: unknown }).task ?? result;
  } catch (err) {
    console.warn("[agentClient] addTask falling back to service.js:", err);
    return service.addTask(task, tdate, category, priority, repeatType, repeatDuration, longTerm);
  }
}

// ---------------------------------------------------------------------------
// updateField
// ---------------------------------------------------------------------------

export async function updateField(
  id: number,
  field: string,
  value: unknown,
): Promise<unknown> {
  if (!AGENT_URL) return service.updateField(id, field, value);

  try {
    const result = await callAction<{ task: unknown }>("updateTask", "POST", {
      id,
      field,
      value,
    });
    // updateTask returns { task: {...} } — mirror service.js which returns item
    return (result as { task: unknown }).task ?? result;
  } catch (err) {
    console.warn("[agentClient] updateField falling back to service.js:", err);
    return service.updateField(id, field, value);
  }
}

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

/**
 * Returns the completion status of the deleted task (boolean).
 * This mirrors service.js deleteTask which returns response.data (a boolean).
 */
export async function deleteTask(taskId: number): Promise<boolean> {
  if (!AGENT_URL) return service.deleteTask(taskId);

  try {
    const result = await callAction<{ success: boolean; completed: boolean }>(
      "deleteTask",
      "DELETE",
      { id: taskId },
    );
    return result.completed;
  } catch (err) {
    console.warn("[agentClient] deleteTask falling back to service.js:", err);
    return service.deleteTask(taskId);
  }
}

// ---------------------------------------------------------------------------
// getScratchpad / saveScratchpad
// ---------------------------------------------------------------------------

export async function getScratchpad(): Promise<unknown> {
  if (!AGENT_URL) return service.getScratchpad();

  try {
    return await callAction<unknown>("getScratchpad", "GET");
  } catch (err) {
    console.warn("[agentClient] getScratchpad falling back to service.js:", err);
    return service.getScratchpad();
  }
}

export async function saveScratchpad(content: string): Promise<unknown> {
  if (!AGENT_URL) return service.saveScratchpad(content);

  try {
    return await callAction<unknown>("saveScratchpad", "POST", { content });
  } catch (err) {
    console.warn("[agentClient] saveScratchpad falling back to service.js:", err);
    return service.saveScratchpad(content);
  }
}
