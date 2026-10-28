import * as z from "zod/v4";
import { todayInZone, weekBounds } from "../dates.js";
import { ToolError, ApiError, fail } from "../errors.js";

export function makeContext({ api, clock, config }) {
  const today = todayInZone(clock(), config.timeZone);
  return {
    api,
    config,
    today,
    week: weekBounds(today),
  };
}

export function runTool(handler, deps) {
  return async (args) => {
    let ctx;
    try {
      ctx = makeContext(deps);
      return await handler(args, ctx);
    } catch (error) {
      const anchors = ctx ? { today: ctx.today, week: ctx.week } : {};
      if (error instanceof ToolError) {
        return fail(error.code, error.message, { ...anchors, ...error.extra });
      }
      if (error instanceof ApiError) {
        return fail(error.code, error.message, anchors);
      }
      console.error("[todo-mcp] unexpected tool error", error);
      return fail("internal_error", "Unexpected error", anchors);
    }
  };
}

export function mapFilters(args = {}) {
  return {
    q: args.query ?? undefined,
    exactName: args.exact_name ?? undefined,
    project: args.project ?? undefined,
    start: args.from ?? undefined,
    end: args.to ?? undefined,
    status: args.status ?? undefined,
    recurring: args.recurring ?? undefined,
  };
}

export function echoFilters(args = {}) {
  return {
    query: args.query ?? null,
    exact_name: args.exact_name ?? null,
    project: args.project ?? null,
    from: args.from ?? null,
    to: args.to ?? null,
    status: args.status ?? "all",
    recurring: args.recurring ?? null,
  };
}

export function assertValidRange(args = {}) {
  if (args.from && args.to && args.from > args.to) {
    throw new ToolError("invalid_range", "from must be on or before to");
  }
}

export const DATE_FILTERS = {
  query: z.string().optional().describe("Name substring, case-insensitive"),
  exact_name: z.string().optional().describe("Exact name, case-insensitive"),
  project: z
    .string()
    .optional()
    .describe("Exact project/category, case-insensitive"),
  from: z.string().optional().describe("Inclusive start date YYYY-MM-DD"),
  to: z.string().optional().describe("Inclusive end date YYYY-MM-DD"),
  status: z
    .enum(["all", "open", "completed"])
    .optional()
    .describe("Filter by completion status"),
  recurring: z
    .boolean()
    .optional()
    .describe("true=only recurring, false=only non-recurring"),
};
