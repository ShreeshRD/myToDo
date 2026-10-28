import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";

export function createMcpServer({ api, clock, config }) {
  const server = new McpServer(
    { name: "todo-mcp", version: "1.0.0" },
    {
      instructions:
        "Todo MCP. Dates are YYYY-MM-DD in Asia/Kolkata. " +
        "Use get_day/get_week to read, count_tasks for counts, " +
        "find_task for one task, and write tools to change tasks. " +
        "Lists are capped at 50. " +
        "For 'today' or 'this week', omit the date/offset argument — do not invent dates. " +
        "Every response includes today= and week= anchors; use them if you need a date.",
    }
  );

  registerTools(server, { api, clock, config });
  return server;
}
