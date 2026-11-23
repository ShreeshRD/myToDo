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
  constructor({ tasks = [], projects = [], goals = [], now = FIXED_CLOCK } = {}) {
    this.tasks = tasks.map((t) => ({ ...t }));
    this.projectsResponse = projects;
    this.goals = goals.map((g) => ({ ...g }));
    this.subtasks = [];
    this.skillOccurrences = [];
    this.calls = [];
    this.failNext = null;
    this.now = now;
    this._nextId =
      this.tasks.reduce((max, t) => Math.max(max, t.id ?? 0), 0) + 1;
    this._nextGoalId =
      this.goals.reduce((max, g) => Math.max(max, g.id ?? 0), 0) + 1;
    this._nextSubtaskId = 1;
    this._nextOccurrenceId = 1;
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
      goalId: params.goalId ?? null,
    };
    if (item.goalId != null) item.longTerm = true;
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
      case "description":
        task.description = value === "null" ? null : value;
        break;
      case "goalId":
        task.goalId = value === "null" || value === "" ? null : Number(value);
        if (task.goalId != null) task.longTerm = true;
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

  async patch(id, fields) {
    this._record("patch", { id, fields });
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return { status: "Error: Item not found", item: null };
    if (fields.description !== undefined) {
      task.description = fields.description === "null" ? null : fields.description;
    }
    if (fields.goalId !== undefined) {
      task.goalId = fields.goalId === "null" ? null : Number(fields.goalId);
      if (task.goalId != null) task.longTerm = true;
    }
    return { status: "Patched", item: { ...task } };
  }

  // ----- goals / roadmap / subtasks / skills -----

  _findGoal(id) {
    return this.goals.find((g) => g.id === id);
  }

  async listGoals() {
    this._record("listGoals");
    return this.goals.map((g) => ({ ...g }));
  }

  async getGoal(id) {
    this._record("getGoal", id);
    const goal = this._findGoal(id);
    if (!goal) {
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("backend_error", "Goal not found", { status: 404 });
    }
    return { ...goal };
  }

  async createGoal(body) {
    this._record("createGoal", body);
    const goal = {
      id: this._nextGoalId++,
      title: body.title,
      kind: body.kind ?? "GOAL",
      mode: body.mode ?? "METRIC",
      status: "ACTIVE",
      metricCurrent: null,
      metricTarget: null,
      metricUnit: null,
      repsTarget: null,
      repsCount: 0,
      linkedTotal: 0,
      linkedCompleted: 0,
      roadmapTotal: 0,
      roadmapCompleted: 0,
      targetMet: false,
      occurrenceCount: body.kind === "SKILL" ? 0 : undefined,
    };
    this.goals.push(goal);
    return { ...goal };
  }

  async updateGoal(id, fields) {
    this._record("updateGoal", { id, fields });
    const goal = this._findGoal(id);
    if (!goal) return null;
    if (fields.title !== undefined) goal.title = fields.title;
    if (fields.mode !== undefined) goal.mode = fields.mode;
    if (fields.metricCurrent !== undefined) {
      goal.metricCurrent = fields.metricCurrent === "null" ? null : Number(fields.metricCurrent);
    }
    if (fields.metricTarget !== undefined) {
      goal.metricTarget = fields.metricTarget === "null" ? null : Number(fields.metricTarget);
    }
    if (fields.metricUnit !== undefined) {
      goal.metricUnit = fields.metricUnit === "null" ? null : fields.metricUnit;
    }
    if (fields.repsTarget !== undefined) {
      goal.repsTarget = fields.repsTarget === "null" ? null : Number(fields.repsTarget);
    }
    return { ...goal };
  }

  async deleteGoal(id) {
    this._record("deleteGoal", id);
    const idx = this.goals.findIndex((g) => g.id === id);
    if (idx >= 0) this.goals.splice(idx, 1);
    for (const t of this.tasks) {
      if (t.goalId === id) {
        t.goalId = null;
        t.roadmapOrder = null;
      }
    }
    this.skillOccurrences = this.skillOccurrences.filter((o) => o.goalId !== id);
  }

  async completeGoal(id) {
    this._record("completeGoal", id);
    const goal = this._findGoal(id);
    if (!goal) return null;
    goal.status = "COMPLETED";
    return { ...goal };
  }

  async reopenGoal(id) {
    this._record("reopenGoal", id);
    const goal = this._findGoal(id);
    if (!goal) return null;
    goal.status = "ACTIVE";
    return { ...goal };
  }

  async addRoadmapStep(goalId, body) {
    this._record("addRoadmapStep", { goalId, body });
    const goal = this._findGoal(goalId);
    if (!goal) {
      const { ApiError } = await import("../src/errors.js");
      throw new ApiError("backend_error", "Goal not found", { status: 404 });
    }
    const existing = this.tasks.filter((t) => t.goalId === goalId && t.roadmapOrder != null);
    const step = {
      id: this._nextId++,
      taskDate: body.date ?? null,
      dayOrder: 1,
      category: "None",
      name: body.name,
      complete: false,
      repeatType: "NONE",
      repeatDuration: 0,
      priority: 0,
      inProgress: false,
      longTerm: true,
      assignedTime: null,
      timeTaken: null,
      goalId,
      roadmapOrder: existing.length + 1,
    };
    this.tasks.push(step);
    goal.roadmapTotal = existing.length + 1;
    return { ...step };
  }

  async reorderRoadmap(goalId, orderedIds) {
    this._record("reorderRoadmap", { goalId, orderedIds });
    orderedIds.forEach((taskId, index) => {
      const task = this.tasks.find((t) => t.id === taskId && t.goalId === goalId);
      if (task) task.roadmapOrder = index + 1;
    });
  }

  async listSubtasks(taskId) {
    this._record("listSubtasks", taskId);
    return this.subtasks
      .filter((s) => s.taskId === taskId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s }));
  }

  async addSubtask(taskId, body) {
    this._record("addSubtask", { taskId, body });
    const next = this.subtasks.filter((s) => s.taskId === taskId).length;
    const subtask = {
      id: this._nextSubtaskId++,
      taskId,
      title: body.title,
      done: false,
      sortOrder: next,
    };
    this.subtasks.push(subtask);
    return { ...subtask };
  }

  async updateSubtask(id, fields) {
    this._record("updateSubtask", { id, fields });
    const subtask = this.subtasks.find((s) => s.id === id);
    if (!subtask) return null;
    if (fields.title !== undefined) subtask.title = fields.title;
    if (fields.done !== undefined) subtask.done = fields.done === true || fields.done === "true";
    return { ...subtask };
  }

  async deleteSubtask(id) {
    this._record("deleteSubtask", id);
    const idx = this.subtasks.findIndex((s) => s.id === id);
    if (idx >= 0) this.subtasks.splice(idx, 1);
  }

  async listSkillOccurrences(skillId) {
    this._record("listSkillOccurrences", skillId);
    return this.skillOccurrences
      .filter((o) => o.goalId === skillId)
      .map((o) => ({ ...o }));
  }

  async logSkillOccurrence(skillId, body) {
    this._record("logSkillOccurrence", { skillId, body });
    const occurrence = {
      id: this._nextOccurrenceId++,
      goalId: skillId,
      date: body.date,
      durationMinutes: Number(body.durationMinutes),
      rating: Number(body.rating),
    };
    this.skillOccurrences.push(occurrence);
    const goal = this._findGoal(skillId);
    if (goal) goal.occurrenceCount = (goal.occurrenceCount ?? 0) + 1;
    return { ...occurrence };
  }

  async updateSkillOccurrence(id, fields) {
    this._record("updateSkillOccurrence", { id, fields });
    const occurrence = this.skillOccurrences.find((o) => o.id === id);
    if (!occurrence) return null;
    if (fields.date !== undefined) occurrence.date = fields.date;
    if (fields.durationMinutes !== undefined) occurrence.durationMinutes = Number(fields.durationMinutes);
    if (fields.rating !== undefined) occurrence.rating = Number(fields.rating);
    return { ...occurrence };
  }

  async deleteSkillOccurrence(id) {
    this._record("deleteSkillOccurrence", id);
    const idx = this.skillOccurrences.findIndex((o) => o.id === id);
    if (idx >= 0) {
      const [removed] = this.skillOccurrences.splice(idx, 1);
      const goal = this._findGoal(removed.goalId);
      if (goal && goal.occurrenceCount > 0) goal.occurrenceCount -= 1;
    }
  }
}

export function parseResult(result) {
  return JSON.parse(result.content[0].text);
}
