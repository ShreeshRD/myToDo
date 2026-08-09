/**
 * list_tasks — Retrieve all tasks, optionally filtered by date group, category,
 * completion status, or priority.
 *
 * Backend mapping: GET /todo/allbydate  (groupByDate=true, default)
 *                  GET /todo/all        (groupByDate=false)
 */

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { callBackend } from "./lib/backendClient";

export default defineAction({
  description:
    "Retrieve all tasks. Optionally filter by category, completion status, or priority. Returns tasks grouped by date by default.",
  schema: z.object({
    groupByDate: z
      .boolean()
      .optional()
      .default(true)
      .describe("Group results by date (default: true)"),
    category: z
      .string()
      .optional()
      .describe("Filter by category name (case-sensitive)"),
    complete: z.boolean().optional().describe("Filter by completion status"),
    priority: z
      .number()
      .int()
      .min(0)
      .max(4)
      .optional()
      .describe(
        "Filter by priority level (0=none, 1=low, 2=medium, 3=high, 4=urgent)",
      ),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ groupByDate, category, complete, priority }) => {
    const path = groupByDate ? "/todo/allbydate" : "/todo/all";
    const response = await callBackend<unknown>({ method: "GET", path });

    if (!response.ok) {
      throw new Error(
        `Backend error ${response.status} fetching tasks: ${JSON.stringify(response.data)}`,
      );
    }

    // Apply client-side filters if provided (backend returns all tasks).
    // These can be pushed server-side once the backend supports query params.
    let tasks = Array.isArray(response.data)
      ? (response.data as Record<string, unknown>[])
      : [];

    if (category !== undefined) {
      tasks = tasks.filter((t) => t["category"] === category);
    }
    if (complete !== undefined) {
      tasks = tasks.filter((t) => Boolean(t["complete"]) === complete);
    }
    if (priority !== undefined) {
      tasks = tasks.filter((t) => t["priority"] === priority);
    }

    return { tasks };
  },
});
