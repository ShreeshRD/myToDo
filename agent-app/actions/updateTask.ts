/**
 * update_task — Update one field of an existing task.
 *
 * Backend mapping: POST /todo/update
 *
 * The backend uses a field-patch model: send the task id, the field name
 * (as the backend expects it), and the new value as a string.
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { auditLog } from "./lib/audit";
import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Update a single field of an existing task identified by its id. Supply the field name and the new value as a string.",
  schema: z.object({
    id: z.number().int().positive().describe("The task id to update"),
    field: z
      .enum([
        "taskName",
        "category",
        "taskDate",
        "dayOrder",
        "complete",
        "priority",
        "repeatType",
        "repeatDuration",
        "assignedTime",
        "inProgress",
        "longTerm",
        "timeTaken",
      ])
      .describe("The task field to update"),
    value: z
      .string()
      .describe(
        "The new value for the field (always a string; booleans as 'true'/'false', numbers as their string form)",
      ),
  }),
  http: { method: "POST" },
  run: async (input, ctx) => {
    const response = await callBackend<Record<string, unknown>>({
      method: "POST",
      path: "/todo/update",
      body: input,
    });

    if (!response.ok) {
      const errMsg = `Backend error ${response.status} updating task ${input.id}: ${JSON.stringify(response.data)}`;
      await auditLog({
        actionName: "updateTask",
        input,
        outcome: "error",
        errorMsg: errMsg,
        actor: ctx?.userEmail,
      });
      throw new Error(errMsg);
    }

    await auditLog({
      actionName: "updateTask",
      input,
      outcome: "success",
      actor: ctx?.userEmail,
    });
    return {
      success: true,
      message: `Task ${input.id} field '${input.field}' updated successfully.`,
      task: response.data ?? null,
    };
  },
});
