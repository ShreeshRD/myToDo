import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { weekdayShort } from "./dates.js";
dayjs.extend(utc);

export function normalizeProject(value) {
  if (value == null || String(value).trim() === "") {
    return "None";
  }
  return String(value).trim();
}

export function compactTask(raw, today, { includeDescription = false } = {}) {
  const date = raw.taskDate ?? raw.date ?? null;
  const project =
    raw.category == null || String(raw.category).trim() === ""
      ? "None"
      : String(raw.category).trim();

  let repeat = null;
  if (raw.repeatType != null && raw.repeatType !== "NONE") {
    repeat = raw.repeatType;
  }

  const overdue = raw.complete === false && date < today;

  const compact = {
    id: raw.id,
    name: raw.name,
    date,
    project,
    priority: raw.priority ?? 0,
    complete: raw.complete === true,
    in_progress: raw.inProgress === true,
    long_term: raw.longTerm === true,
    repeat,
    overdue,
  };

  if (
    raw.complete === true &&
    raw.assignedTime != null &&
    raw.assignedTime !== "null" &&
    raw.assignedTime !== ""
  ) {
    compact.completed_at = raw.assignedTime;
  }

  if (raw.pushCount > 0) {
    compact.push_count = raw.pushCount;
  }
  if (raw.pushedFromId != null) {
    compact.pushed_from = raw.pushedFromId;
  }
  if (raw.goalId != null) {
    compact.goal_id = raw.goalId;
  }
  if (raw.roadmapOrder != null) {
    compact.roadmap_order = raw.roadmapOrder;
  }
  // Descriptions can be 4k chars; keep them off list responses (40k context).
  if (includeDescription && raw.description != null && raw.description !== "") {
    compact.description = raw.description;
  }
  if (Array.isArray(raw.subtasks)) {
    compact.subtasks = raw.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      done: s.done === true,
    }));
  }

  return compact;
}

/** Compact GoalView / SkillOccurrence payloads for tool results. */
export function compactGoal(raw) {
  if (raw == null) return null;
  const compact = {
    id: raw.id,
    title: raw.title,
    kind: raw.kind ?? "GOAL",
    mode: raw.mode ?? "METRIC",
    status: raw.status ?? "ACTIVE",
    linked_total: raw.linkedTotal ?? 0,
    linked_completed: raw.linkedCompleted ?? 0,
    target_met: raw.targetMet === true,
  };
  if (raw.metricCurrent != null) compact.metric_current = raw.metricCurrent;
  if (raw.metricTarget != null) compact.metric_target = raw.metricTarget;
  if (raw.metricUnit != null) compact.metric_unit = raw.metricUnit;
  if (raw.repsTarget != null) compact.reps_target = raw.repsTarget;
  if (raw.repsCount != null) compact.reps_count = raw.repsCount;
  if (raw.roadmapTotal != null) compact.roadmap_total = raw.roadmapTotal;
  if (raw.roadmapCompleted != null) compact.roadmap_completed = raw.roadmapCompleted;
  if (raw.occurrenceCount != null) compact.occurrence_count = raw.occurrenceCount;
  return compact;
}

export function compactSubtask(raw) {
  return {
    id: raw.id,
    task_id: raw.taskId,
    title: raw.title,
    done: raw.done === true,
    sort_order: raw.sortOrder ?? 0,
  };
}

export function compactOccurrence(raw) {
  return {
    id: raw.id,
    skill_id: raw.goalId,
    date: raw.date,
    duration_minutes: raw.durationMinutes,
    rating: raw.rating,
  };
}

export function sortDayOrder(tasks) {
  return [...tasks].sort((a, b) => {
    const ao = a.dayOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.dayOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

export function sortDateId(tasks) {
  return [...tasks].sort((a, b) => {
    const ad = a.taskDate ?? a.date ?? "";
    const bd = b.taskDate ?? b.date ?? "";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

export function groupWeek(tasks, weekStart, today, maxTasks = Infinity) {
  const byDate = new Map();
  for (const task of tasks) {
    const date = task.taskDate ?? task.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(task);
  }

  const days = [];
  let cursor = dayjs.utc(weekStart);
  for (let i = 0; i < 7; i++) {
    const key = cursor.format("YYYY-MM-DD");
    const dayTasks = sortDayOrder(byDate.get(key) ?? []).map((t) =>
      compactTask(t, today)
    );
    const open = dayTasks.filter((t) => !t.complete).length;
    const completed = dayTasks.length - open;
    days.push({
      date: key,
      weekday: weekdayShort(key),
      tasks: dayTasks.slice(0, maxTasks),
      counts: { total: dayTasks.length, open, completed },
    });
    cursor = cursor.add(1, "day");
  }
  return days;
}
