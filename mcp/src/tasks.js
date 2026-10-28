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

export function compactTask(raw, today) {
  const date = raw.taskDate ?? raw.date;
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

  return compact;
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
