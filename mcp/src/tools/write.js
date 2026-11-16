import { isIsoDate } from "../dates.js";
import { compactTask, normalizeProject } from "../tasks.js";
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

  const result = await api.add({
    category: project,
    name,
    taskDate: date,
    priority,
    longTerm,
  });

  if (result?.status && String(result.status).startsWith("Error")) {
    throw new ToolError("backend_error", result.status);
  }

  return ok({
    today,
    week,
    task: compactTask(result.item, today),
  });
}

const FIELD_ORDER = ["name", "date", "project", "priority", "long_term"];

const FIELD_TO_BACKEND = {
  name: "taskName",
  date: "taskDate",
  project: "category",
  priority: "priority",
  long_term: "longTerm",
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
        task: refreshed ? compactTask(refreshed, today) : null,
      });
    }
    updated.push(field);
  }

  const task = await api.getItem(id);
  return ok({
    today,
    week,
    task: compactTask(task, today),
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
      task: compactTask(task, today),
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
    task: compactTask(task, today),
    next_task: nextTask ? compactTask(nextTask, today) : null,
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
      task: compactTask(task, today),
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
    task: compactTask(task, today),
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
    task: compactTask(original, today),
    clone: result?.clone ? compactTask(result.clone, today) : null,
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
    task: compactTask(task, today),
  });
}
