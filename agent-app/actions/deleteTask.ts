/**
 * delete_task — Remove a task from the system.
 *
 * Backend mapping: DELETE /todo/delete/{id}
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { auditLog } from "./lib/audit";
import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Permanently delete a task by its id. This action cannot be undone — confirm with the user before calling.",
  schema: z.object({
    id: z.number().int().positive().describe("The id of the task to delete"),
  }),
  http: { method: "DELETE" },
  run: async ({ id }, ctx) => {
    const input = { id };
    const response = await callBackend<unknown>({
      method: "DELETE",
      path: `/todo/delete/${id}`,
    });

    if (!response.ok) {
      const errMsg = `Backend error ${response.status} deleting task ${id}: ${JSON.stringify(response.data)}`;
      await auditLog({
        actionName: "deleteTask",
        input,
        outcome: "error",
        errorMsg: errMsg,
        actor: ctx?.userEmail,
      });
      throw new Error(errMsg);
    }

    await auditLog({
      actionName: "deleteTask",
      input,
      outcome: "success",
      actor: ctx?.userEmail,
    });
    return {
      success: true,
      completed: Boolean(response.data),
      message: `Task ${id} deleted successfully.`,
    };
  },
});
