export const FIXED_CLOCK = () => new Date("2026-10-28T10:00:00+05:30");

/** Same date math the backend uses (Java LocalDate semantics for months). */
function nextOccurrenceDate(taskDate, repeatType, repeatDuration) {
  if (!Number.isInteger(repeatDuration) || repeatDuration <= 0) return null;
  const d = new Date(`${taskDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const addDays = (n) => {
    const c = new Date(d);
    c.setUTCDate(c.getUTCDate() + n);
    return c.toISOString().slice(0, 10);
  };
  switch (repeatType) {
    case "EVERY_X_DAYS":
      return addDays(repeatDuration);
    case "EVERY_X_WEEKS":
      return addDays(repeatDuration * 7);
    case "EVERY_X_MONTHS": {
      const day = d.getUTCDate();
      const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + repeatDuration, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(day, lastDay));
      return target.toISOString().slice(0, 10);
    }
    case "SPECIFIC_WEEKDAYS": {
      if (repeatDuration > 127) return null;
      const bits = repeatDuration.toString(2).padStart(7, "0");
      let cursor = d;
      for (let i = 0; i < 7; i++) {
        cursor = new Date(cursor);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        const dayIndex = (cursor.getUTCDay() + 6) % 7; // Mon=0..Sun=6
        if (bits[dayIndex] === "1") {
          return cursor.toISOString().slice(0, 10);
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function makeConfig(overrides = {}) {
  return {
    host: "127.0.0.1",
    port: 8765,
    path: "/mcp",
    apiUrl: "http://127.0.0.1:8000",
    apiTimeoutMs: 5000,
    timeZone: "Asia/Kolkata",
    maxTasks: 50,
    ...overrides,
  };
}

export function makeRawTask(overrides = {}) {
  return {
    taskDate: "2026-10-28",
    dayOrder: 1,
    id: 1,
    category: "Personal",
    name: "Take daily photo",
    complete: false,
    repeatType: "EVERY_X_DAYS",
    repeatDuration: 1,
    priority: 0,
    inProgress: false,
    longTerm: false,
    assignedTime: null,
    timeTaken: null,
    ...overrides,
  };
}

export class FakeApi {
  constructor({ tasks = [], projects = [], now = FIXED_CLOCK } = {}) {
    this.tasks = tasks.map((t) => ({ ...t }));
    this.projectsResponse = projects;
    this.calls = [];
    this.failNext = null;
    this.now = now;
    this._nextId =
      this.tasks.reduce((max, t) => Math.max(max, t.id ?? 0), 0) + 1;
  }

  _record(method, args) {
    this.calls.push({ method, args });
  }

  _matchQuery(params = {}) {
    let list = this.tasks.map((t) => ({ ...t }));
    if (params.q != null) {
      const q = String(params.q).toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    if (params.exactName != null) {
      const n = String(params.exactName).toLowerCase();
      list = list.filter((t) => t.name.toLowerCase() === n);
    }
    if (params.project != null) {
      const p = String(params.project).toLowerCase();
      list = list.filter((t) => {
        const cat =
          t.category == null || String(t.category).trim() === ""
            ? "none"
            : String(t.category).trim().toLowerCase();
        return cat === p;
      });
    }
    if (params.start != null) {
      list = list.filter((t) => t.taskDate >= params.start);
    }
    if (params.end != null) {
      list = list.filter((t) => t.taskDate <= params.end);
    }
    if (params.status === "open") {
      list = list.filter((t) => !t.complete);
    } else if (params.status === "completed") {
      list = list.filter((t) => t.complete);
    }
    if (params.recurring === true) {
      list = list.filter((t) => t.repeatType != null && t.repeatType !== "NONE");
    } else if (params.recurring === false) {
      list = list.filter((t) => t.repeatType == null || t.repeatType === "NONE");
    }

    const order = params.order === "desc" ? "desc" : "asc";
    list.sort((a, b) => {
      if (a.taskDate !== b.taskDate) {
        return order === "desc"
          ? b.taskDate.localeCompare(a.taskDate)
          : a.taskDate.localeCompare(b.taskDate);
      }
      return order === "desc" ? b.id - a.id : a.id - b.id;
    });

    const limit = params.limit != null ? Number(params.limit) : list.length;
    return list.slice(0, limit);
  }

  async query(params) {
    this._record("query", params);
    if (this.failNext === "query") {
      this.failNext = null;
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("backend_error", "query failed");
    }
    return this._matchQuery(params);
  }

  async count(params) {
    this._record("count", params);
    const list = this._matchQuery({ ...params, order: undefined, limit: undefined });
    const completed = list.filter((t) => t.complete).length;
    return {
      count: list.length,
      open: list.length - completed,
      completed,
    };
  }

  async getItem(id) {
    this._record("getItem", id);
    const found = this.tasks.find((t) => t.id === id);
    if (!found) {
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("task_not_found", `Task ${id} not found`, { status: 404 });
    }
    return { ...found };
  }

  async projects() {
    this._record("projects");
    if (this.projectsResponse.length) {
      return this.projectsResponse;
    }
    const counts = new Map();
    for (const t of this.tasks) {
      const key =
        t.category == null || String(t.category).trim() === ""
          ? "None"
          : String(t.category).trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async add(params) {
    this._record("add", params);
    if (this.failNext === "add") {
      this.failNext = null;
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("backend_error", "add failed");
    }
    if (this.addErrorStatus) {
      return { status: this.addErrorStatus, item: null };
    }
    const item = {
      id: this._nextId++,
      taskDate: params.taskDate,
      dayOrder: 1,
      category: params.category,
      name: params.name,
      complete: false,
      repeatType: params.repeatType ?? "NONE",
      repeatDuration: params.repeatDuration ?? 0,
      priority: params.priority ?? 0,
      inProgress: false,
      longTerm: params.longTerm ?? false,
      assignedTime: null,
      timeTaken: null,
    };
    this.tasks.push(item);
    return { status: "Added", item: { ...item } };
  }

  async update(id, field, value) {
    this._record("update", { id, field, value });
    if (this.failNextUpdate === field) {
      this.failNextUpdate = null;
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("backend_error", `update ${field} failed`);
    }
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      return { status: "Error: Item not found", item: null };
    }
    if (this.updateErrorFields?.includes(field)) {
      return { status: `Error: bad ${field}`, item: null };
    }
    switch (field) {
      case "taskName":
        task.name = value;
        break;
      case "taskDate":
        task.taskDate = value;
        break;
      case "category":
        task.category = value;
        break;
      case "priority":
        task.priority = Number(value);
        break;
      case "longTerm":
        task.longTerm = String(value) === "true";
        break;
      case "complete": {
        const wasComplete = task.complete;
        task.complete = String(value) === "true";
        if (task.complete) {
          task.assignedTime = "09:15:00";
          // Mirror the real backend: completing a recurring task creates the
          // next occurrence and returns it as nextTask (or a warning why not).
          if (!wasComplete) {
            const next = this._maybeCreateNextOccurrence(task);
            if (next) {
              return { status: "Updated", item: { ...task }, nextTask: { ...next } };
            }
            if (task.repeatType != null && task.repeatType !== "NONE") {
              return { status: "Updated", item: { ...task }, warning: this._lastRepeatWarning ?? null };
            }
          }
        }
        break;
      }
      case "inProgress":
        task.inProgress = String(value) === "true";
        break;
      case "assignedTime":
        task.assignedTime = value === "null" ? null : value;
        break;
      default:
        return { status: "Error: Invalid field", item: null };
    }
    return { status: "Updated", item: { ...task } };
  }

  _maybeCreateNextOccurrence(source) {
    this._lastRepeatWarning = null;
    const pattern = source.repeatType;
    if (pattern == null || pattern === "NONE") return null;
    const duration = source.repeatDuration;
    if (!Number.isInteger(duration) || duration <= 0) {
      this._lastRepeatWarning = "invalid_repeat_rule";
      return null;
    }
    const nextDate = nextOccurrenceDate(source.taskDate, pattern, duration);
    if (!nextDate) {
      this._lastRepeatWarning = "invalid_repeat_rule";
      return null;
    }
    const duplicate = this.tasks.find(
      (t) =>
        t.id !== source.id &&
        t.taskDate === nextDate &&
        String(t.name).trim().toLowerCase() === String(source.name).trim().toLowerCase() &&
        String(t.category ?? "None").trim().toLowerCase() ===
          String(source.category ?? "None").trim().toLowerCase()
    );
    if (duplicate) {
      this._lastRepeatWarning = "next_instance_exists";
      return null;
    }
    if (this.failNext === "add") {
      this.failNext = null;
      this._lastRepeatWarning = "next_instance_create_failed";
      return null;
    }
    const item = {
      id: this._nextId++,
      taskDate: nextDate,
      dayOrder: this.tasks.filter((t) => t.taskDate === nextDate).length + 1,
      category: source.category,
      name: source.name,
      complete: false,
      repeatType: source.repeatType,
      repeatDuration: source.repeatDuration,
      priority: source.priority ?? 0,
      inProgress: false,
      longTerm: source.longTerm ?? false,
      assignedTime: null,
      timeTaken: null,
    };
    this.tasks.push(item);
    return item;
  }

  async push(id, reason, date) {
    this._record("push", { id, reason, date });
    const original = this.tasks.find((t) => t.id === id);
    if (!original) {
      return { status: "Error: Item not found", original: null, clone: null };
    }
    const target = date ?? "2026-10-29";
    const nextPushCount = (original.pushCount ?? 0) + 1;
    original.complete = true;
    original.assignedTime = "09:15:00";
    original.pushCount = nextPushCount;
    original.chainRootId = original.chainRootId ?? original.id;
    const clone = {
      id: this._nextId++,
      taskDate: target,
      dayOrder: 1,
      category: original.category,
      name: original.name,
      complete: false,
      repeatType: original.repeatType ?? "NONE",
      repeatDuration: original.repeatDuration ?? 0,
      priority: original.priority ?? 0,
      inProgress: false,
      longTerm: original.longTerm ?? false,
      assignedTime: null,
      timeTaken: null,
      pushedFromId: original.id,
      chainRootId: original.chainRootId,
      pushCount: nextPushCount,
    };
    this.tasks.push(clone);
    return { status: "Pushed", original: { ...original }, clone: { ...clone } };
  }

  async delete(id) {
    this._record("delete", id);
    if (this.deleteReturnsFalse) {
      // still delete, but return false like the real backend for incomplete tasks
    }
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    const [removed] = this.tasks.splice(idx, 1);
    return removed.complete === true;
  }
}

export function parseResult(result) {
  return JSON.parse(result.content[0].text);
}
