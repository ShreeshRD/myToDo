/**
 * get_scratchpad — Retrieve the active scratchpad document.
 *
 * Backend mapping: GET /todo/scratchpad
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Retrieve the current scratchpad / notes document. The content field is a stringified JSON block array (BlockNote format).",
  schema: z.object({}),
  http: { method: "GET" },
  readOnly: true,
  run: async () => {
    const response = await callBackend<Record<string, unknown>>({
      method: "GET",
      path: "/todo/scratchpad",
    });

    if (!response.ok) {
      throw new Error(
        `Backend error ${response.status} fetching scratchpad: ${JSON.stringify(response.data)}`,
      );
    }

    return response.data;
  },
});
