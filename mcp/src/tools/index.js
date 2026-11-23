import * as z from "zod/v4";
import { runTool, DATE_FILTERS } from "./shared.js";
import { ok } from "../errors.js";
import { compactGoal } from "../tasks.js";
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
  pushTask,
  deleteTask,
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  addRoadmapStep,
  reorderRoadmap,
  listSubtasks,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  logSkillOccurrence,
  listSkillOccurrences,
  updateSkillOccurrence,
  deleteSkillOccurrence,
} from "./write.js";

const ID = z.number().int().positive();

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

  server.registerTool(
    "list_goals",
    {
      title: "List goals",
      description:
        "List goals and skills with progress. kind filter: GOAL or SKILL.",
      inputSchema: {
        kind: z.enum(["GOAL", "SKILL"]).optional().describe("Filter by kind"),
        status: z.enum(["ACTIVE", "COMPLETED"]).optional().describe("Filter by status"),
      },
    },
    runTool(async (args, ctx) => {
      const { api, today, week } = ctx;
      let rows = await api.listGoals();
      if (args.kind) rows = rows.filter((g) => g.kind === args.kind);
      if (args.status) rows = rows.filter((g) => g.status === args.status);
      return ok({ today, week, goals: rows.map(compactGoal) });
    }, deps)
  );

  server.registerTool(
    "list_subtasks",
    {
      title: "List subtasks",
      description: "List the embedded checklist rows for one task.",
      inputSchema: { task_id: ID.describe("Parent task id") },
    },
    runTool(listSubtasks, deps)
  );

  server.registerTool(
    "list_skill_occurrences",
    {
      title: "List skill occurrences",
      description: "List practice occurrences for one skill (newest first).",
      inputSchema: { skill_id: ID.describe("Skill goal id") },
    },
    runTool(listSkillOccurrences, deps)
  );
}

export function registerWriteTools(server, deps) {
  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "Create a non-recurring task. OMIT date for today (must be today or later). Link a goal with goal_id (sets long_term).",
      inputSchema: {
        name: z.string().min(1).max(200).describe("Task name"),
        date: z
          .string()
          .optional()
          .describe("YYYY-MM-DD, today or later. OMIT for today."),
        project: z.string().max(50).optional().describe("Project/category; default None"),
        priority: z.number().int().min(0).max(4).optional().describe("0-4; default 0"),
        long_term: z.boolean().optional().describe("Default false"),
        goal_id: ID.optional().describe("Link to a goal; sets long_term true"),
        description: z.string().max(4000).optional().describe("Notes/body"),
      },
    },
    runTool(createTask, deps)
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update name, date, project, priority, long_term, description, or goal_id by id. goal_id null unlinks. Use complete_task to change completion.",
      inputSchema: {
        id: ID.describe("Task id"),
        name: z.string().min(1).max(200).optional(),
        date: z.string().optional().describe("YYYY-MM-DD; must be today or later"),
        project: z.string().max(50).optional(),
        priority: z.number().int().min(0).max(4).optional(),
        long_term: z.boolean().optional(),
        description: z.string().max(4000).optional(),
        goal_id: ID.nullable().optional().describe("Goal id, or null to unlink"),
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
        id: ID.describe("Task id"),
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
        id: ID.describe("Task id"),
      },
    },
    runTool(uncompleteTask, deps)
  );

  server.registerTool(
    "push_task",
    {
      title: "Push task",
      description:
        "Push a task to a later date: mark it complete now, record the required reason, and create a deferred copy (only unchecked checklist items) on the chosen date. Defaults to +1 day.",
      inputSchema: {
        id: ID.describe("Task id"),
        reason: z.string().min(1).max(500).describe("Why the task is being pushed"),
        date: z
          .string()
          .optional()
          .describe("YYYY-MM-DD, today or later. OMIT for +1 day."),
      },
    },
    runTool(pushTask, deps)
  );

  server.registerTool(
    "delete_task",
    {
      title: "Delete task",
      description: "Delete a task. Requires the exact current task name as a safety check.",
      inputSchema: {
        id: ID.describe("Task id"),
        name: z.string().min(1).describe("Exact current task name"),
      },
    },
    runTool(deleteTask, deps)
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create goal",
      description: "Create a goal or skill. kind SKILL is for practice tracking.",
      inputSchema: {
        title: z.string().min(1).max(255).describe("Goal title"),
        kind: z.enum(["GOAL", "SKILL"]).optional().describe("Default GOAL"),
        mode: z.enum(["METRIC", "ROADMAP", "REPS"]).optional().describe("Default METRIC"),
      },
    },
    runTool(createGoal, deps)
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update goal",
      description: "Update title, mode, metric fields, or reps_target on a goal/skill.",
      inputSchema: {
        id: ID.describe("Goal id"),
        title: z.string().min(1).max(255).optional(),
        mode: z.enum(["METRIC", "ROADMAP", "REPS"]).optional(),
        metric_current: z.number().nullable().optional(),
        metric_target: z.number().nullable().optional(),
        metric_unit: z.string().nullable().optional(),
        reps_target: z.number().int().nullable().optional(),
      },
    },
    runTool(updateGoal, deps)
  );

  server.registerTool(
    "delete_goal",
    {
      title: "Delete goal",
      description:
        "Delete a goal/skill (occurrences removed with skills). Requires exact title. Linked tasks are unlinked.",
      inputSchema: {
        id: ID.describe("Goal id"),
        title: z.string().min(1).describe("Exact current goal title"),
      },
    },
    runTool(deleteGoal, deps)
  );

  server.registerTool(
    "complete_goal",
    {
      title: "Complete or reopen goal",
      description: "Archive a goal (default) or reopen it with reopen=true.",
      inputSchema: {
        id: ID.describe("Goal id"),
        reopen: z.boolean().optional().describe("true to reopen instead of complete"),
      },
    },
    runTool(completeGoal, deps)
  );

  server.registerTool(
    "add_roadmap_step",
    {
      title: "Add roadmap step",
      description:
        "Add an ordered step to a ROADMAP-mode goal. Omit date for backlog (hidden from day lists).",
      inputSchema: {
        goal_id: ID.describe("Goal id"),
        name: z.string().min(1).max(255).describe("Step name"),
        date: z.string().optional().describe("YYYY-MM-DD; omit for backlog"),
      },
    },
    runTool(addRoadmapStep, deps)
  );

  server.registerTool(
    "reorder_roadmap",
    {
      title: "Reorder roadmap",
      description: "Set the full ordered list of roadmap step task ids for a goal.",
      inputSchema: {
        goal_id: ID.describe("Goal id"),
        ordered_ids: z
          .array(ID)
          .min(1)
          .describe("Every roadmap step task id in display order"),
      },
    },
    runTool(reorderRoadmap, deps)
  );

  server.registerTool(
    "add_subtask",
    {
      title: "Add subtask",
      description: "Append a checklist row to a task.",
      inputSchema: {
        task_id: ID.describe("Parent task id"),
        title: z.string().min(1).max(500).describe("Checklist text"),
      },
    },
    runTool(addSubtask, deps)
  );

  server.registerTool(
    "update_subtask",
    {
      title: "Update subtask",
      description: "Rename and/or toggle done on a checklist row.",
      inputSchema: {
        id: ID.describe("Subtask id"),
        title: z.string().min(1).max(500).optional(),
        done: z.boolean().optional(),
      },
    },
    runTool(updateSubtask, deps)
  );

  server.registerTool(
    "delete_subtask",
    {
      title: "Delete subtask",
      description: "Remove a checklist row from a task.",
      inputSchema: { id: ID.describe("Subtask id") },
    },
    runTool(deleteSubtask, deps)
  );

  server.registerTool(
    "log_skill_occurrence",
    {
      title: "Log skill occurrence",
      description:
        "Log one practice session for a skill. Duration (minutes) and rating 1-5 are required.",
      inputSchema: {
        skill_id: ID.describe("Skill goal id"),
        duration_minutes: z.number().int().min(1).describe("Practice minutes (>0)"),
        rating: z.number().int().min(1).max(5).describe("Performance 1-5"),
        date: z.string().optional().describe("YYYY-MM-DD; default today"),
      },
    },
    runTool(logSkillOccurrence, deps)
  );

  server.registerTool(
    "update_skill_occurrence",
    {
      title: "Update skill occurrence",
      description: "Edit date and/or duration and/or rating on a logged occurrence.",
      inputSchema: {
        id: ID.describe("Occurrence id"),
        date: z.string().optional(),
        duration_minutes: z.number().int().min(1).optional(),
        rating: z.number().int().min(1).max(5).optional(),
      },
    },
    runTool(updateSkillOccurrence, deps)
  );

  server.registerTool(
    "delete_skill_occurrence",
    {
      title: "Delete skill occurrence",
      description: "Remove one logged practice occurrence.",
      inputSchema: { id: ID.describe("Occurrence id") },
    },
    runTool(deleteSkillOccurrence, deps)
  );
}