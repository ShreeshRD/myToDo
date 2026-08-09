/**
 * save_scratchpad — Overwrite the scratchpad document content.
 *
 * Backend mapping: POST /todo/scratchpad
 *
 * The content field must be a stringified JSON block array
 * (BlockNote / ProseMirror-compatible format) as stored by the frontend editor.
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { auditLog } from "./lib/audit";
import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Overwrite the scratchpad / notes document. The content field must be a valid stringified JSON block array. Read the existing scratchpad first (get_scratchpad) before overwriting to avoid data loss.",
  schema: z.object({
    content: z
      .string()
      .describe(
        "Stringified JSON block array (BlockNote format) representing the full scratchpad content",
      ),
  }),
  http: { method: "POST" },
  run: async ({ content }, ctx) => {
    const input = { content };
    const response = await callBackend<Record<string, unknown>>({
      method: "POST",
      path: "/todo/scratchpad",
      body: input,
    });

    if (!response.ok) {
      const errMsg = `Backend error ${response.status} saving scratchpad: ${JSON.stringify(response.data)}`;
      await auditLog({
        actionName: "saveScratchpad",
        input,
        outcome: "error",
        errorMsg: errMsg,
        actor: ctx?.userEmail,
      });
      throw new Error(errMsg);
    }

    await auditLog({
      actionName: "saveScratchpad",
      input,
      outcome: "success",
      actor: ctx?.userEmail,
    });
    return {
      success: true,
      scratchpad: response.data,
    };
  },
});
