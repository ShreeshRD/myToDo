/**
 * create_task — Create a new task on a specific date.
 *
 * Backend mapping: POST /todo/add
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { auditLog } from "./lib/audit";
import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Create a new task. Requires a task name and date (YYYY-MM-DD). Optionally set category, priority, repeat schedule, and long-term flag.",
  schema: z.object({
    name: z
      .string()
      .min(1, "Task name cannot be empty")
      .describe("The task title/name"),
    taskDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
      .describe("Date the task belongs to (YYYY-MM-DD)"),
    category: z
      .string()
      .optional()
      .default("None")
      .describe("Category label (default: 'None')"),
    priority: z
      .number()
      .int()
      .min(0)
      .max(4)
      .optional()
      .default(0)
      .describe("Priority 0–4 (0=none, 4=urgent)"),
    repeatType: z
      .enum([
        "NONE",
        "EVERY_X_DAYS",
        "EVERY_X_WEEKS",
        "EVERY_X_MONTHS",
        "SPECIFIC_WEEKDAYS",
      ])
      .optional()
      .default("NONE")
      .describe("Repeat schedule type"),
    repeatDuration: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .default(0)
      .describe("Repeat interval (e.g. every N days)"),
    longTerm: z
      .boolean()
      .optional()
      .default(false)
      .describe("Mark as a long-term goal task"),
  }),
  http: { method: "POST" },
  run: async (input, ctx) => {
    const response = await callBackend<Record<string, unknown>>({
      method: "POST",
      path: "/todo/add",
      body: input,
    });

    if (!response.ok) {
      const errMsg = `Backend error ${response.status} creating task: ${JSON.stringify(response.data)}`;
      await auditLog({
        actionName: "createTask",
        input,
        outcome: "error",
        errorMsg: errMsg,
        actor: ctx?.userEmail,
      });
      throw new Error(errMsg);
    }

    await auditLog({
      actionName: "createTask",
      input,
      outcome: "success",
      actor: ctx?.userEmail,
    });
    return {
      success: true,
      message: "Task created successfully.",
      task: response.data,
    };
  },
});
