import * as z from "zod/v4";
import { runTool, DATE_FILTERS } from "./shared.js";
import {
  getDay,
  getWeek,
  countTasks,
  findTask,
  listProjects,
} from "./read.js";
import {
  createTask,
  updateTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from "./write.js";

export function registerTools(server, deps) {
  registerReadTools(server, deps);
  registerWriteTools(server, deps);
}

export function registerReadTools(server, deps) {
  server.registerTool(
    "get_day",
    {
      title: "Get day tasks",
      description:
        "Get tasks for one date (Asia/Kolkata). OMIT date for today. Today also includes overdue open tasks.",
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe("YYYY-MM-DD. OMIT for today. Never invent a date."),
        include_overdue: z
          .boolean()
          .optional()
          .describe("Include overdue when date is today; default true"),
      },
    },
    runTool(getDay, deps)
  );

  server.registerTool(
    "get_week",
    {
      title: "Get week tasks",
      description:
        "Get tasks for the current week (Mon-Sun, Asia/Kolkata). OMIT week_offset for this week.",
      inputSchema: {
        week_offset: z
          .number()
          .int()
          .min(-52)
          .max(52)
          .optional()
          .describe("Weeks relative to current; OMIT for this week"),
      },
    },
    runTool(getWeek, deps)
  );

  server.registerTool(
    "count_tasks",
    {
      title: "Count tasks",
      description: "Count tasks matching filters. Returns counts only, never task lists.",
      inputSchema: DATE_FILTERS,
    },
    runTool(countTasks, deps)
  );

  server.registerTool(
    "find_task",
    {
      title: "Find one task",
      description:
        "Find one task matching filters, ordered by task date. Use exact_name for recurring task names.",
      inputSchema: {
        order: z.enum(["latest", "oldest"]).describe("latest or oldest"),
        ...DATE_FILTERS,
      },
    },
    runTool(findTask, deps)
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List project names (backend category) and total task counts.",
      inputSchema: {},
    },
    runTool(listProjects, deps)
  );
}

export function registerWriteTools(server, deps) {
  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "Create a non-recurring task. OMIT date for today (must be today or later).",
      inputSchema: {
        name: z.string().min(1).max(200).describe("Task name"),
        date: z
          .string()
          .optional()
          .describe("YYYY-MM-DD, today or later. OMIT for today."),
        project: z.string().max(50).optional().describe("Project/category; default None"),
        priority: z.number().int().min(0).max(4).optional().describe("0-4; default 0"),
        long_term: z.boolean().optional().describe("Default false"),
      },
    },
    runTool(createTask, deps)
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update name, date, project, priority, or long_term by id. Use complete_task to change completion.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id"),
        name: z.string().min(1).max(200).optional(),
        date: z.string().optional().describe("YYYY-MM-DD; must be today or later"),
        project: z.string().max(50).optional(),
        priority: z.number().int().min(0).max(4).optional(),
        long_term: z.boolean().optional(),
      },
    },
    runTool(updateTask, deps)
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description:
        "Mark a task complete. If it recurs, create the next instance (duplicate-safe) and return it.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id"),
      },
    },
    runTool(completeTask, deps)
  );

  server.registerTool(
    "uncomplete_task",
    {
      title: "Uncomplete task",
      description: "Mark a task incomplete and clear its completion time.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id"),
      },
    },
    runTool(uncompleteTask, deps)
  );

  server.registerTool(
    "delete_task",
    {
      title: "Delete task",
      description: "Delete a task. Requires the exact current task name as a safety check.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id"),
        name: z.string().min(1).describe("Exact current task name"),
      },
    },
    runTool(deleteTask, deps)
  );
}
