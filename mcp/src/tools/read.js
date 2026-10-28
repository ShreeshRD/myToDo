import { isIsoDate, addDays, weekBoundsForOffset } from "../dates.js";
import { compactTask, sortDayOrder, sortDateId, groupWeek } from "../tasks.js";
import { ToolError, ok } from "../errors.js";
import {
  mapFilters,
  echoFilters,
  assertValidRange,
} from "./shared.js";

export async function getDay(args = {}, ctx) {
  const { api, config, today, week } = ctx;
  const maxTasks = config.maxTasks;
  let date = args.date ?? today;
  if (!isIsoDate(date)) {
    throw new ToolError("invalid_date", "date must be a valid YYYY-MM-DD date");
  }

  const includeOverdue = args.include_overdue !== false;
  const showOverdue = date === today && includeOverdue;

  const dayLimit = maxTasks + 1;
  const dayRaw = await api.query({
    start: date,
    end: date,
    order: "asc",
    limit: dayLimit,
  });
  const dayCounts = await api.count({ start: date, end: date });

  let overdueRaw = [];
  let overdueCounts = { count: 0 };
  if (showOverdue) {
    overdueRaw = await api.query({
      end: addDays(today, -1),
      status: "open",
      order: "asc",
      limit: dayLimit,
    });
    overdueCounts = await api.count({ end: addDays(today, -1), status: "open" });
  }

  const daySorted = sortDayOrder(dayRaw);
  const dayTruncated = daySorted.length > maxTasks;
  const dayTasks = daySorted.slice(0, maxTasks).map((t) => compactTask(t, today));

  const overdueSorted = sortDateId(overdueRaw);
  const overdueTruncated = overdueSorted.length > maxTasks;
  const overdueTasks = overdueSorted
    .slice(0, maxTasks)
    .map((t) => compactTask(t, today));

  return ok({
    today,
    date,
    week,
    tasks: dayTasks,
    overdue: overdueTasks,
    counts: {
      tasks: dayCounts.count,
      tasks_open: dayCounts.open,
      tasks_completed: dayCounts.completed,
      overdue: overdueCounts.count,
    },
    truncated: { tasks: dayTruncated, overdue: overdueTruncated },
  });
}

export async function getWeek(args = {}, ctx) {
  const { api, config, today } = ctx;
  const maxTasks = config.maxTasks;
  const offset = args.week_offset ?? 0;
  const bounds = weekBoundsForOffset(today, offset);

  const raw = await api.query({
    start: bounds.start,
    end: bounds.end,
    order: "asc",
    limit: maxTasks + 1,
  });
  const counts = await api.count({ start: bounds.start, end: bounds.end });

  const truncated = raw.length > maxTasks;
  const flat = raw.slice(0, maxTasks);
  const days = groupWeek(flat, bounds.start, today, maxTasks);

  return ok({
    today,
    week: { start: bounds.start, end: bounds.end, offset },
    days,
    counts: {
      total: counts.count,
      open: counts.open,
      completed: counts.completed,
    },
    truncated,
  });
}

export async function countTasks(args = {}, ctx) {
  const { api, today, week } = ctx;
  assertValidRange(args);
  const result = await api.count(mapFilters(args));
  return ok({
    today,
    week,
    count: result.count,
    open: result.open,
    completed: result.completed,
    filters: echoFilters(args),
  });
}

export async function findTask(args = {}, ctx) {
  const { api, config, today, week } = ctx;
  assertValidRange(args);
  const order = args.order === "latest" ? "desc" : "asc";
  const rows = await api.query({ ...mapFilters(args), order, limit: 1 });
  const found = rows.length > 0;
  return ok({
    today,
    week,
    found,
    task: found ? compactTask(rows[0], today) : null,
    filters: echoFilters(args),
  });
}

export async function listProjects(_args = {}, ctx) {
  const { api, today, week } = ctx;
  const projects = await api.projects();
  return ok({
    today,
    week,
    projects,
  });
}
