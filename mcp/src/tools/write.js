import { isIsoDate } from "../dates.js";
import {
  compactTask,
  compactGoal,
  compactSubtask,
  compactOccurrence,
  normalizeProject,
} from "../tasks.js";
import { ToolError, ok } from "../errors.js";

function assertDateNotPast(date, today) {
  if (date < today) {
    throw new ToolError("date_in_past", "date must be today or later");
  }
}

function assertValidDate(date) {
  if (!isIsoDate(date)) {
    throw new ToolError("invalid_date", "date must be a valid YYYY-MM-DD date");
  }
}

async function fetchTask(api, id) {
  try {
    return await api.getItem(id);
  } catch (error) {
    if (error.code === "task_not_found") {
      throw new ToolError("task_not_found", `Task ${id} not found`);
    }
    throw error;
  }
}

export async function createTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const name = (args.name ?? "").trim();
  if (!name) {
    throw new ToolError("invalid_name", "name must not be empty");
  }
  const date = args.date ?? today;
  assertValidDate(date);
  assertDateNotPast(date, today);

  const project = normalizeProject(args.project);
  const priority = args.priority ?? 0;
  const longTerm = args.long_term ?? false;
  const params = {
    category: project,
    name,
    taskDate: date,
    priority,
    longTerm,
  };
  if (args.goal_id != null) {
    if (!Number.isInteger(args.goal_id) || args.goal_id <= 0) {
      throw new ToolError("invalid_goal_id", "goal_id must be a positive integer");
    }
    params.goalId = args.goal_id;
  }

  const result = await api.add(params);

  if (result?.status && String(result.status).startsWith("Error")) {
    throw new ToolError("backend_error", result.status);
  }

  let item = result.item;
  const warnings = [];
  if (args.description != null && String(args.description) !== "") {
    try {
      const patched = await api.patch(item.id, { description: String(args.description) });
      if (patched?.status && String(patched.status).startsWith("Error")) {
        warnings.push("description_not_saved");
      } else {
        item = await api.getItem(item.id);
      }
    } catch {
      warnings.push("description_not_saved");
    }
  }

  return ok({
    today,
    week,
    task: compactTask(item, today, { includeDescription: true }),
    warnings,
  });
}

const FIELD_ORDER = ["name", "date", "project", "priority", "long_term", "description", "goal_id"];

const FIELD_TO_BACKEND = {
  name: "taskName",
  date: "taskDate",
  project: "category",
  priority: "priority",
  long_term: "longTerm",
  description: "description",
  goal_id: "goalId",
};

export async function updateTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const id = args.id;
  const provided = FIELD_ORDER.filter((f) => args[f] !== undefined);
  if (provided.length === 0) {
    throw new ToolError("no_fields", "provide at least one field");
  }

  await fetchTask(api, id);

  const values = {};
  for (const field of provided) {
    let value = args[field];
    if (field === "name") {
      value = String(value).trim();
      if (!value) {
        throw new ToolError("invalid_name", "name must not be empty");
      }
    } else if (field === "date") {
      assertValidDate(value);
      assertDateNotPast(value, today);
    } else if (field === "project") {
      value = normalizeProject(value);
    } else if (field === "description") {
      // Empty string is dropped by buildUrl; send "null" so the backend clears it.
      value = value == null || String(value) === "" ? "null" : String(value);
    } else if (field === "goal_id") {
      if (value == null) {
        value = "null";
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) {
          throw new ToolError("invalid_goal_id", "goal_id must be a positive integer or null");
        }
        value = String(n);
      }
    }
    values[field] = value;
  }

  const warnings = [];
  const updated = [];

  for (const field of provided) {
    const result = await api.update(id, FIELD_TO_BACKEND[field], values[field]);
    if (result?.status && String(result.status).startsWith("Error")) {
      const refreshed = await api.getItem(id).catch(() => null);
      throw new ToolError("backend_error", result.status, {
        failed_field: field,
        updated_fields: updated,
        task: refreshed ? compactTask(refreshed, today, { includeDescription: true }) : null,
      });
    }
    updated.push(field);
  }

  const task = await api.getItem(id);
  return ok({
    today,
    week,
    task: compactTask(task, today, { includeDescription: true }),
    updated_fields: updated,
    warnings,
  });
}

export async function completeTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const id = args.id;
  const warnings = [];

  let task = await fetchTask(api, id);

  if (task.complete === true) {
    return ok({
      today,
      week,
      task: compactTask(task, today, { includeDescription: true }),
      next_task: null,
      warnings: ["already_complete"],
    });
  }

  // Backend owns recurrence: completing returns nextTask when it created one,
  // or a warning explaining why it did not.
  const result = await api.update(id, "complete", "true");
  if (result?.status && String(result.status).startsWith("Error")) {
    throw new ToolError("backend_error", result.status);
  }
  if (result?.warning) {
    warnings.push(result.warning);
  }

  try {
    await api.update(id, "inProgress", "false");
  } catch {
    warnings.push("in_progress_clear_failed");
  }

  task = await api.getItem(id);
  const nextTask = result?.nextTask ?? null;

  return ok({
    today,
    week,
    task: compactTask(task, today, { includeDescription: true }),
    next_task: nextTask ? compactTask(nextTask, today, { includeDescription: true }) : null,
    warnings,
  });
}

export async function uncompleteTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const id = args.id;
  const warnings = [];

  let task = await fetchTask(api, id);

  if (task.complete === false) {
    return ok({
      today,
      week,
      task: compactTask(task, today, { includeDescription: true }),
      warnings: ["already_incomplete"],
    });
  }

  const result = await api.update(id, "complete", "false");
  if (result?.status && String(result.status).startsWith("Error")) {
    throw new ToolError("backend_error", result.status);
  }

  // The backend clears completedAt. assignedTime is the scheduled time and must
  // survive un-completion.

  task = await api.getItem(id);
  return ok({
    today,
    week,
    task: compactTask(task, today, { includeDescription: true }),
    warnings,
  });
}

export async function pushTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const id = args.id;
  const reason = String(args.reason ?? "").trim();
  if (!reason) {
    throw new ToolError("invalid_reason", "reason must not be empty");
  }
  if (args.date !== undefined) {
    assertValidDate(args.date);
    assertDateNotPast(args.date, today);
  }

  const task = await fetchTask(api, id);
  if (task.complete === true) {
    throw new ToolError("already_complete", `Task ${id} is already complete`);
  }

  const result = await api.push(id, reason, args.date);
  if (result?.status && String(result.status).startsWith("Error")) {
    throw new ToolError("backend_error", result.status);
  }

  const original = result?.original ?? (await api.getItem(id));
  return ok({
    today,
    week,
    task: compactTask(original, today, { includeDescription: true }),
    clone: result?.clone ? compactTask(result.clone, today, { includeDescription: true }) : null,
    warnings: [],
  });
}

export async function deleteTask(args = {}, ctx) {
  const { api, today, week } = ctx;
  const id = args.id;
  const name = String(args.name ?? "").trim();

  const task = await fetchTask(api, id);

  if (name.toLowerCase() !== String(task.name ?? "").trim().toLowerCase()) {
    throw new ToolError("name_mismatch", "name does not match task", {
      actual_name: task.name,
      id,
    });
  }

  await api.delete(id);

  let stillThere = false;
  try {
    const again = await api.getItem(id);
    stillThere = again != null;
  } catch (error) {
    if (error.code === "task_not_found") {
      stillThere = false;
    } else {
      throw error;
    }
  }

  if (stillThere) {
    throw new ToolError("delete_failed", "task still exists after delete");
  }

  return ok({
    today,
    week,
    deleted: true,
    task: compactTask(task, today, { includeDescription: true }),
  });
}

// ---------- goals / roadmap ----------

function assertPositiveId(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ToolError(`invalid_${field}`, `${field} must be a positive integer`);
  }
}

async function fetchGoal(api, id) {
  try {
    return await api.getGoal(id);
  } catch (error) {
    if (error?.status === 404) {
      throw new ToolError("goal_not_found", `Goal ${id} not found`);
    }
    throw error;
  }
}

export async function createGoal(args = {}, ctx) {
  const { api, today, week } = ctx;
  const title = String(args.title ?? "").trim();
  if (!title) {
    throw new ToolError("invalid_title", "title must not be empty");
  }
  const body = { title };
  if (args.kind) body.kind = args.kind;
  if (args.mode) body.mode = args.mode;
  const created = await api.createGoal(body);
  return ok({ today, week, goal: compactGoal(created) });
}

export async function updateGoal(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  const fields = {};
  if (args.title !== undefined) {
    const title = String(args.title).trim();
    if (!title) throw new ToolError("invalid_title", "title must not be empty");
    fields.title = title;
  }
  if (args.mode !== undefined) fields.mode = args.mode;
  if (args.metric_current !== undefined) {
    fields.metricCurrent = args.metric_current == null ? "null" : String(args.metric_current);
  }
  if (args.metric_target !== undefined) {
    fields.metricTarget = args.metric_target == null ? "null" : String(args.metric_target);
  }
  if (args.metric_unit !== undefined) {
    fields.metricUnit = args.metric_unit == null ? "null" : String(args.metric_unit);
  }
  if (args.reps_target !== undefined) {
    fields.repsTarget = args.reps_target == null ? "null" : String(args.reps_target);
  }
  if (Object.keys(fields).length === 0) {
    throw new ToolError("no_fields", "provide at least one field");
  }
  const updated = await api.updateGoal(args.id, fields);
  return ok({ today, week, goal: compactGoal(updated) });
}

export async function deleteGoal(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  const title = String(args.title ?? "").trim();
  const goal = await fetchGoal(api, args.id);
  if (title.toLowerCase() !== String(goal.title ?? "").trim().toLowerCase()) {
    throw new ToolError("title_mismatch", "title does not match goal", {
      actual_title: goal.title,
      id: args.id,
    });
  }
  await api.deleteGoal(args.id);
  return ok({ today, week, deleted: true, goal: compactGoal(goal) });
}

export async function completeGoal(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  const goal = args.reopen === true
    ? await api.reopenGoal(args.id)
    : await api.completeGoal(args.id);
  return ok({ today, week, goal: compactGoal(goal) });
}

export async function addRoadmapStep(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.goal_id, "goal_id");
  const name = String(args.name ?? "").trim();
  if (!name) throw new ToolError("invalid_name", "name must not be empty");
  if (args.date !== undefined && args.date != null) {
    assertValidDate(args.date);
    // Roadmap steps may be scheduled into the past (backlog/dated history).
  }
  const body = { name };
  if (args.date) body.date = args.date;
  const step = await api.addRoadmapStep(args.goal_id, body);
  return ok({ today, week, task: compactTask(step, today, { includeDescription: true }) });
}

export async function reorderRoadmap(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.goal_id, "goal_id");
  const ids = args.ordered_ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((n) => Number.isInteger(n) && n > 0)) {
    throw new ToolError("invalid_ordered_ids", "ordered_ids must be a non-empty array of positive integers");
  }
  await api.reorderRoadmap(args.goal_id, ids);
  return ok({ today, week, reordered: ids });
}

// ---------- subtasks ----------

export async function listSubtasks(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.task_id, "task_id");
  const rows = await api.listSubtasks(args.task_id);
  return ok({
    today,
    week,
    task_id: args.task_id,
    subtasks: rows.map(compactSubtask),
  });
}

export async function addSubtask(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.task_id, "task_id");
  const title = String(args.title ?? "").trim();
  if (!title) throw new ToolError("invalid_title", "title must not be empty");
  const created = await api.addSubtask(args.task_id, { title });
  return ok({ today, week, subtask: compactSubtask(created) });
}

export async function updateSubtask(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  const fields = {};
  if (args.title !== undefined) {
    const title = String(args.title).trim();
    if (!title) throw new ToolError("invalid_title", "title must not be empty");
    fields.title = title;
  }
  if (args.done !== undefined) fields.done = String(args.done === true);
  if (Object.keys(fields).length === 0) {
    throw new ToolError("no_fields", "provide title and/or done");
  }
  const updated = await api.updateSubtask(args.id, fields);
  return ok({ today, week, subtask: compactSubtask(updated) });
}

export async function deleteSubtask(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  await api.deleteSubtask(args.id);
  return ok({ today, week, deleted: true, id: args.id });
}

// ---------- skills ----------

export async function logSkillOccurrence(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.skill_id, "skill_id");
  const duration = Number(args.duration_minutes);
  const rating = Number(args.rating);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new ToolError("invalid_duration", "duration_minutes must be a positive integer");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ToolError("invalid_rating", "rating must be an integer from 1 to 5");
  }
  const date = args.date ?? today;
  assertValidDate(date);
  const created = await api.logSkillOccurrence(args.skill_id, {
    date,
    durationMinutes: String(duration),
    rating: String(rating),
  });
  return ok({ today, week, occurrence: compactOccurrence(created) });
}

export async function listSkillOccurrences(args = {}, ctx) {
  const { api, today, week, config } = ctx;
  assertPositiveId(args.skill_id, "skill_id");
  const rows = await api.listSkillOccurrences(args.skill_id);
  const cap = config?.maxTasks ?? 50;
  return ok({
    today,
    week,
    skill_id: args.skill_id,
    total: rows.length,
    truncated: rows.length > cap,
    occurrences: rows.slice(0, cap).map(compactOccurrence),
  });
}

export async function updateSkillOccurrence(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  const fields = {};
  if (args.date !== undefined) {
    assertValidDate(args.date);
    fields.date = args.date;
  }
  if (args.duration_minutes !== undefined) {
    const duration = Number(args.duration_minutes);
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new ToolError("invalid_duration", "duration_minutes must be a positive integer");
    }
    fields.durationMinutes = String(duration);
  }
  if (args.rating !== undefined) {
    const rating = Number(args.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ToolError("invalid_rating", "rating must be an integer from 1 to 5");
    }
    fields.rating = String(rating);
  }
  if (Object.keys(fields).length === 0) {
    throw new ToolError("no_fields", "provide date, duration_minutes, and/or rating");
  }
  const updated = await api.updateSkillOccurrence(args.id, fields);
  return ok({ today, week, occurrence: compactOccurrence(updated) });
}

export async function deleteSkillOccurrence(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertPositiveId(args.id, "id");
  await api.deleteSkillOccurrence(args.id);
  return ok({ today, week, deleted: true, id: args.id });
}
