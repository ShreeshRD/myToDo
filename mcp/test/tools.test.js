import test from "node:test";
import assert from "node:assert/strict";
import { runTool } from "../src/tools/shared.js";
import {
  getDay,
  getWeek,
  countTasks,
  findTask,
  listProjects,
} from "../src/tools/read.js";
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
} from "../src/tools/write.js";
import { FakeApi, FIXED_CLOCK, makeConfig, makeRawTask, parseResult } from "./fixtures.js";

function makeCtx(api, overrides = {}) {
  const config = makeConfig(overrides.config);
  const clock = FIXED_CLOCK;
  // today from fixed clock in Asia/Kolkata is 2026-10-28
  return {
    api,
    config,
    today: "2026-10-28",
    week: { start: "2026-10-26", end: "2026-11-01" },
    clock,
  };
}

function deps(api, overrides = {}) {
  return { api, clock: FIXED_CLOCK, config: makeConfig(overrides.config) };
}

// ---------- get_day ----------

test("getDayDefaultsToToday", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-28", name: "Today" }),
      makeRawTask({ id: 2, taskDate: "2026-10-26", name: "Overdue" }),
    ],
  });
  const result = parseResult(await getDay({}, makeCtx(api)));
  assert.equal(result.today, "2026-10-28");
  assert.deepEqual(result.week, { start: "2026-10-26", end: "2026-11-01" });
  assert.equal(result.date, "2026-10-28");
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].name, "Today");
  assert.equal(result.overdue.length, 1);
  assert.equal(result.overdue[0].name, "Overdue");
  assert.equal(result.counts.tasks, 1);
  assert.equal(result.counts.overdue, 1);
  const queries = api.calls.filter((c) => c.method === "query");
  assert.equal(queries.length, 2);
});

test("getDayExplicitPastDate", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-26", name: "Old" }),
      makeRawTask({ id: 2, taskDate: "2026-10-20", name: "Older" }),
    ],
  });
  const result = parseResult(await getDay({ date: "2026-10-26" }, makeCtx(api)));
  assert.equal(result.date, "2026-10-26");
  assert.deepEqual(result.overdue, []);
  assert.equal(result.counts.overdue, 0);
  const queries = api.calls.filter((c) => c.method === "query");
  assert.equal(queries.length, 1);
});

test("getDayIncludeOverdueFalse", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-28" }),
      makeRawTask({ id: 2, taskDate: "2026-10-26" }),
    ],
  });
  const result = parseResult(
    await getDay({ include_overdue: false }, makeCtx(api))
  );
  assert.deepEqual(result.overdue, []);
  const queries = api.calls.filter((c) => c.method === "query");
  assert.equal(queries.length, 1);
});

test("getDayTruncatesTasks", async () => {
  const tasks = Array.from({ length: 51 }, (_, i) =>
    makeRawTask({ id: i + 1, name: `T${i}`, dayOrder: i + 1 })
  );
  const api = new FakeApi({ tasks });
  const result = parseResult(await getDay({}, makeCtx(api)));
  assert.equal(result.tasks.length, 50);
  assert.equal(result.truncated.tasks, true);
  assert.equal(result.counts.tasks, 51);
});

test("getDayTruncatesOverdue", async () => {
  const tasks = Array.from({ length: 51 }, (_, i) =>
    makeRawTask({ id: i + 1, name: `O${i}`, taskDate: "2026-10-20" })
  );
  const api = new FakeApi({ tasks });
  const result = parseResult(await getDay({}, makeCtx(api)));
  assert.equal(result.overdue.length, 50);
  assert.equal(result.truncated.overdue, true);
  assert.equal(result.counts.overdue, 51);
});

// ---------- get_week ----------

test("getWeekCurrent", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-26", name: "Mon" }),
      makeRawTask({ id: 2, taskDate: "2026-10-28", name: "Wed" }),
      makeRawTask({ id: 3, taskDate: "2026-11-01", name: "Sun" }),
    ],
  });
  const result = parseResult(await getWeek({}, makeCtx(api)));
  assert.equal(result.days.length, 7);
  assert.equal(result.week.start, "2026-10-26");
  assert.equal(result.week.end, "2026-11-01");
  assert.equal(result.week.offset, 0);
  assert.equal(result.counts.total, 3);
  assert.equal(result.days[0].tasks.length, 1);
  assert.equal(result.days[0].tasks[0].name, "Mon");
  assert.equal(result.days[2].tasks[0].name, "Wed");
  assert.equal(result.days[6].tasks[0].name, "Sun");
  assert.equal(result.days[1].tasks.length, 0);
});

test("getWeekOffset", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, taskDate: "2026-11-03", name: "NextTue" })],
  });
  const result = parseResult(await getWeek({ week_offset: 1 }, makeCtx(api)));
  assert.equal(result.week.start, "2026-11-02");
  assert.equal(result.week.end, "2026-11-08");
  assert.equal(result.week.offset, 1);
  assert.equal(result.counts.total, 1);
});

test("getWeekTruncates", async () => {
  const tasks = Array.from({ length: 51 }, (_, i) => {
    const day = 26 + (i % 6);
    return makeRawTask({
      id: i + 1,
      name: `T${i}`,
      taskDate: `2026-10-${day}`,
      dayOrder: i + 1,
    });
  });
  const api = new FakeApi({ tasks });
  const result = parseResult(await getWeek({}, makeCtx(api)));
  assert.equal(result.truncated, true);
  const total = result.days.reduce((n, d) => n + d.tasks.length, 0);
  assert.equal(total, 50);
  assert.equal(result.counts.total, 51);
});

// ---------- count_tasks ----------

test("countTasksPassesFilters", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, name: "Take photo", category: "Personal" }),
      makeRawTask({ id: 2, name: "Other", category: "Office" }),
    ],
  });
  const result = parseResult(
    await countTasks(
      { query: "photo", project: "Personal", status: "open" },
      makeCtx(api)
    )
  );
  const call = api.calls.find((c) => c.method === "count");
  assert.equal(call.args.q, "photo");
  assert.equal(call.args.project, "Personal");
  assert.equal(call.args.status, "open");
  assert.equal(result.count, 1);
  assert.deepEqual(result.filters, {
    query: "photo",
    exact_name: null,
    project: "Personal",
    from: null,
    to: null,
    status: "open",
    recurring: null,
  });
  assert.equal(result.today, "2026-10-28");
});

test("countTasksInvalidRange", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(countTasks, deps(api));
  const result = await wrapped({ from: "2026-11-01", to: "2026-10-01" });
  assert.equal(result.isError, true);
  const body = parseResult(result);
  assert.equal(body.error, "invalid_range");
});

// ---------- find_task ----------

test("findTaskLatest", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-20", name: "Old" }),
      makeRawTask({ id: 2, taskDate: "2026-10-28", name: "New" }),
    ],
  });
  const result = parseResult(
    await findTask({ order: "latest", exact_name: "New" }, makeCtx(api))
  );
  const call = api.calls.find((c) => c.method === "query");
  assert.equal(call.args.order, "desc");
  assert.equal(call.args.limit, 1);
  assert.equal(result.found, true);
  assert.equal(result.task.name, "New");
});

test("findTaskOldest", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, taskDate: "2026-10-20", name: "Old" }),
      makeRawTask({ id: 2, taskDate: "2026-10-28", name: "New" }),
    ],
  });
  const result = parseResult(await findTask({ order: "oldest" }, makeCtx(api)));
  const call = api.calls.find((c) => c.method === "query");
  assert.equal(call.args.order, "asc");
  assert.equal(result.found, true);
  assert.equal(result.task.name, "Old");
});

test("findTaskNone", async () => {
  const api = new FakeApi({ tasks: [makeRawTask({ id: 1 })] });
  const result = parseResult(
    await findTask({ order: "latest", query: "zzz" }, makeCtx(api))
  );
  assert.equal(result.found, false);
  assert.equal(result.task, null);
});

// ---------- list_projects ----------

test("listProjects", async () => {
  const api = new FakeApi({
    projects: [
      { name: "None", count: 445 },
      { name: "Personal", count: 71 },
    ],
  });
  const result = parseResult(await listProjects({}, makeCtx(api)));
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].name, "None");
  assert.equal(result.today, "2026-10-28");
});

// ---------- create_task ----------

test("createTaskValid", async () => {
  const api = new FakeApi({});
  const result = parseResult(
    await createTask(
      { name: "  New task  ", date: "2026-10-28", project: "Personal", priority: 2, long_term: true },
      makeCtx(api)
    )
  );
  const call = api.calls.find((c) => c.method === "add");
  assert.equal(call.args.name, "New task");
  assert.equal(call.args.category, "Personal");
  assert.equal(call.args.taskDate, "2026-10-28");
  assert.equal(call.args.priority, 2);
  assert.equal(call.args.longTerm, true);
  assert.equal(result.task.name, "New task");
  assert.equal(result.task.project, "Personal");
});

test("createTaskDefaults", async () => {
  const api = new FakeApi({});
  const result = parseResult(await createTask({ name: "D" }, makeCtx(api)));
  const call = api.calls.find((c) => c.method === "add");
  assert.equal(call.args.taskDate, "2026-10-28");
  assert.equal(call.args.category, "None");
  assert.equal(call.args.priority, 0);
  assert.equal(call.args.longTerm, false);
  assert.equal(result.task.date, "2026-10-28");
});

test("createTaskPastDate", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(createTask, deps(api));
  const result = await wrapped({ name: "X", date: "2026-10-27" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "date_in_past");
  assert.equal(api.calls.filter((c) => c.method === "add").length, 0);
});

test("createTaskInvalidDate", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(createTask, deps(api));
  const result = await wrapped({ name: "X", date: "2026-02-30" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "invalid_date");
  assert.equal(api.calls.filter((c) => c.method === "add").length, 0);
});

test("createTaskEmptyName", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(createTask, deps(api));
  const result = await wrapped({ name: "   " });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "invalid_name");
  assert.equal(api.calls.filter((c) => c.method === "add").length, 0);
});

// ---------- update_task ----------

test("updateTaskMultipleFields", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Old", taskDate: "2026-10-28" })],
  });
  const result = parseResult(
    await updateTask(
      { id: 1, name: "New", date: "2026-10-30" },
      makeCtx(api)
    )
  );
  const updates = api.calls.filter((c) => c.method === "update");
  assert.deepEqual(
    updates.map((c) => c.args.field),
    ["taskName", "taskDate"]
  );
  assert.equal(result.task.name, "New");
  assert.equal(result.task.date, "2026-10-30");
  assert.deepEqual(result.updated_fields, ["name", "date"]);
});

test("updateTaskNoFields", async () => {
  const api = new FakeApi({ tasks: [makeRawTask({ id: 1 })] });
  const wrapped = runTool(updateTask, deps(api));
  const result = await wrapped({ id: 1 });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "no_fields");
  assert.equal(api.calls.filter((c) => c.method === "update").length, 0);
});

test("updateTaskNotFound", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(updateTask, deps(api));
  const result = await wrapped({ id: 999, name: "X" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "task_not_found");
});

test("updateTaskPastDate", async () => {
  const api = new FakeApi({ tasks: [makeRawTask({ id: 1 })] });
  const wrapped = runTool(updateTask, deps(api));
  const result = await wrapped({ id: 1, date: "2026-10-01" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "date_in_past");
  assert.equal(api.calls.filter((c) => c.method === "update").length, 0);
});

test("updateTaskBackendError", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Old" })],
  });
  api.updateErrorFields = ["taskDate"];
  const wrapped = runTool(updateTask, deps(api));
  const result = await wrapped({ id: 1, name: "New", date: "2026-10-29" });
  assert.equal(result.isError, true);
  const body = parseResult(result);
  assert.equal(body.error, "backend_error");
  assert.equal(body.failed_field, "date");
  assert.deepEqual(body.updated_fields, ["name"]);
  assert.equal(body.task.name, "New");
});

// ---------- complete_task ----------

test("completeTaskNonRecurring", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, repeatType: "NONE", repeatDuration: 0, inProgress: true })],
  });
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  const updates = api.calls.filter((c) => c.method === "update");
  assert.deepEqual(
    updates.map((c) => c.args.field),
    ["complete", "inProgress"]
  );
  assert.equal(result.task.complete, true);
  assert.equal(result.next_task, null);
  assert.deepEqual(result.warnings, []);
});

test("completeTaskAlreadyComplete", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: true })],
  });
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.deepEqual(result.warnings, ["already_complete"]);
  assert.equal(result.next_task, null);
  assert.equal(api.calls.filter((c) => c.method === "update").length, 0);
});

test("completeTaskRecurringCreatesNext", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({
        id: 1,
        name: "Daily",
        category: "Personal",
        taskDate: "2026-10-28",
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 1,
        priority: 2,
        longTerm: true,
      }),
    ],
  });
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.equal(result.task.complete, true);
  assert.ok(result.next_task);
  assert.equal(result.next_task.date, "2026-10-29");
  assert.equal(result.next_task.name, "Daily");
  assert.equal(result.next_task.project, "Personal");
  assert.equal(result.next_task.priority, 2);
  assert.equal(result.next_task.long_term, true);
  assert.equal(result.next_task.repeat, "EVERY_X_DAYS");
  assert.equal(result.next_task.complete, false);
  assert.deepEqual(result.warnings, []);
});

test("completeTaskDuplicateSkips", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({
        id: 1,
        name: "Daily",
        category: "Personal",
        taskDate: "2026-10-28",
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 1,
      }),
      makeRawTask({
        id: 2,
        name: "Daily",
        category: "Personal",
        taskDate: "2026-10-29",
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 1,
      }),
    ],
  });
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.deepEqual(result.warnings, ["next_instance_exists"]);
  assert.equal(result.next_task, null);
  assert.equal(api.calls.filter((c) => c.method === "add").length, 0);
});

test("completeTaskInvalidRule", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({
        id: 1,
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 0,
      }),
    ],
  });
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.deepEqual(result.warnings, ["invalid_repeat_rule"]);
  assert.equal(result.next_task, null);
  assert.equal(api.calls.filter((c) => c.method === "add").length, 0);
});

test("completeTaskAddFails", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({
        id: 1,
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 1,
      }),
    ],
  });
  api.failNext = "add";
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.ok(result.warnings.includes("next_instance_create_failed"));
  assert.equal(result.next_task, null);
  assert.equal(result.task.complete, true);
});

test("completeTaskInProgressClearFails", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, repeatType: "NONE" })],
  });
  api.failNextUpdate = "inProgress";
  const result = parseResult(await completeTask({ id: 1 }, makeCtx(api)));
  assert.ok(result.warnings.includes("in_progress_clear_failed"));
  assert.equal(result.task.complete, true);
});

// ---------- uncomplete_task ----------

test("uncompleteTaskKeepsAssignedTime", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: true, assignedTime: "09:15:00" })],
  });
  const result = parseResult(await uncompleteTask({ id: 1 }, makeCtx(api)));
  const updates = api.calls.filter((c) => c.method === "update");
  assert.deepEqual(
    updates.map((c) => [c.args.field, c.args.value]),
    [["complete", "false"]]
  );
  assert.equal(result.task.complete, false);
  assert.equal(result.task.completed_at, undefined);
});

test("uncompleteTaskAlreadyIncomplete", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: false })],
  });
  const result = parseResult(await uncompleteTask({ id: 1 }, makeCtx(api)));
  assert.deepEqual(result.warnings, ["already_incomplete"]);
  assert.equal(api.calls.filter((c) => c.method === "update").length, 0);
});

// ---------- push_task ----------

test("pushTaskCreatesClone", async () => {
  const api = new FakeApi({
    tasks: [
      makeRawTask({
        id: 1,
        name: "Push me",
        complete: false,
        repeatType: "EVERY_X_DAYS",
        repeatDuration: 1,
      }),
    ],
  });
  const result = parseResult(
    await pushTask({ id: 1, reason: "Blocked", date: "2026-10-31" }, makeCtx(api))
  );
  const call = api.calls.find((c) => c.method === "push");
  assert.deepEqual(call.args, { id: 1, reason: "Blocked", date: "2026-10-31" });
  assert.equal(result.task.complete, true);
  assert.equal(result.task.push_count, 1);
  assert.equal(result.clone.date, "2026-10-31");
  assert.equal(result.clone.complete, false);
  assert.equal(result.clone.pushed_from, 1);
  assert.equal(result.clone.push_count, 1);
  assert.equal(result.clone.repeat, "EVERY_X_DAYS");
});

test("pushTaskDefaultsToBackendDate", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: false })],
  });
  const result = parseResult(
    await pushTask({ id: 1, reason: "Later" }, makeCtx(api))
  );
  const call = api.calls.find((c) => c.method === "push");
  assert.equal(call.args.date, undefined);
  assert.equal(result.clone.date, "2026-10-29");
});

test("pushTaskRequiresReason", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: false })],
  });
  const wrapped = runTool(pushTask, deps(api));
  const result = await wrapped({ id: 1, reason: "   " });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "invalid_reason");
  assert.equal(api.calls.filter((c) => c.method === "push").length, 0);
});

test("pushTaskRejectsCompletedTask", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: true })],
  });
  const wrapped = runTool(pushTask, deps(api));
  const result = await wrapped({ id: 1, reason: "Again" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "already_complete");
  assert.equal(api.calls.filter((c) => c.method === "push").length, 0);
});

test("pushTaskRejectsPastDate", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, complete: false })],
  });
  const wrapped = runTool(pushTask, deps(api));
  const result = await wrapped({ id: 1, reason: "Later", date: "2026-10-27" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "date_in_past");
  assert.equal(api.calls.filter((c) => c.method === "push").length, 0);
});

// ---------- delete_task ----------

test("deleteTaskNameMatch", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Delete me" })],
  });
  const result = parseResult(
    await deleteTask({ id: 1, name: "  delete ME " }, makeCtx(api))
  );
  assert.equal(result.deleted, true);
  assert.equal(result.task.name, "Delete me");
  assert.equal(api.calls.filter((c) => c.method === "delete").length, 1);
  assert.equal(api.tasks.length, 0);
});

test("deleteTaskNameMismatch", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Keep me" })],
  });
  const wrapped = runTool(deleteTask, deps(api));
  const result = await wrapped({ id: 1, name: "Wrong" });
  assert.equal(result.isError, true);
  const body = parseResult(result);
  assert.equal(body.error, "name_mismatch");
  assert.equal(body.actual_name, "Keep me");
  assert.equal(api.calls.filter((c) => c.method === "delete").length, 0);
  assert.equal(api.tasks.length, 1);
});

test("deleteTaskNotFound", async () => {
  const api = new FakeApi({});
  const wrapped = runTool(deleteTask, deps(api));
  const result = await wrapped({ id: 999, name: "X" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "task_not_found");
});

test("deleteTaskVerifyFails", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Sticky" })],
  });
  const originalDelete = api.delete.bind(api);
  api.delete = async (id) => {
    // pretend delete did nothing
    api._record("delete", id);
    return false;
  };
  const wrapped = runTool(deleteTask, deps(api));
  const result = await wrapped({ id: 1, name: "Sticky" });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "delete_failed");
});

test("deleteTaskIgnoresFalseBoolean", async () => {
  const api = new FakeApi({
    tasks: [makeRawTask({ id: 1, name: "Incomplete", complete: false })],
  });
  // FakeApi.delete returns complete flag; incomplete → false, but item is gone
  const result = parseResult(
    await deleteTask({ id: 1, name: "Incomplete" }, makeCtx(api))
  );
  assert.equal(result.deleted, true);
  assert.equal(api.tasks.length, 0);
});

// ---------- description / goal link ----------

test("updateTaskSetsDescription", async () => {
  const api = new FakeApi({ tasks: [makeRawTask({ id: 1 })] });
  const result = parseResult(
    await updateTask({ id: 1, description: "Drink water" }, makeCtx(api))
  );
  assert.deepEqual(result.updated_fields, ["description"]);
  assert.equal(result.task.description, "Drink water");
});

test("createTaskAcceptsGoalId", async () => {
  const api = new FakeApi({
    goals: [{ id: 3, title: "Run", kind: "GOAL", mode: "METRIC", status: "ACTIVE" }],
  });
  const result = parseResult(
    await createTask({ name: "Long run", goal_id: 3 }, makeCtx(api))
  );
  const call = api.calls.find((c) => c.method === "add");
  assert.equal(call.args.goalId, 3);
  assert.equal(result.task.goal_id, 3);
  assert.equal(result.task.long_term, true);
});

// ---------- goals / roadmap ----------

test("createGoalAndList", async () => {
  const api = new FakeApi();
  const created = parseResult(await createGoal({ title: "Ship feature" }, makeCtx(api)));
  assert.equal(created.goal.title, "Ship feature");
  assert.equal(created.goal.kind, "GOAL");

  const skill = parseResult(await createGoal({ title: "Guitar", kind: "SKILL" }, makeCtx(api)));
  assert.equal(skill.goal.kind, "SKILL");

  const rows = await api.listGoals();
  assert.equal(rows.length, 2);
});

test("updateGoalMetricFields", async () => {
  const api = new FakeApi({
    goals: [{ id: 1, title: "Run", kind: "GOAL", mode: "METRIC", status: "ACTIVE" }],
  });
  const result = parseResult(
    await updateGoal(
      { id: 1, metric_current: 10, metric_target: 50, metric_unit: "km" },
      makeCtx(api)
    )
  );
  assert.equal(result.goal.metric_current, 10);
  assert.equal(result.goal.metric_target, 50);
  assert.equal(result.goal.metric_unit, "km");
});

test("deleteGoalRequiresTitleMatch", async () => {
  const api = new FakeApi({
    goals: [{ id: 1, title: "Run more", kind: "GOAL", mode: "METRIC", status: "ACTIVE" }],
  });
  const wrapped = runTool(deleteGoal, deps(api));
  const bad = await wrapped({ id: 1, title: "Wrong" });
  assert.equal(bad.isError, true);
  assert.equal(parseResult(bad).error, "title_mismatch");

  const good = parseResult(await deleteGoal({ id: 1, title: "Run more" }, makeCtx(api)));
  assert.equal(good.deleted, true);
  assert.equal(api.goals.length, 0);
});

test("completeGoalReopens", async () => {
  const api = new FakeApi({
    goals: [{ id: 1, title: "X", kind: "GOAL", mode: "METRIC", status: "ACTIVE" }],
  });
  const done = parseResult(await completeGoal({ id: 1 }, makeCtx(api)));
  assert.equal(done.goal.status, "COMPLETED");
  const reopened = parseResult(await completeGoal({ id: 1, reopen: true }, makeCtx(api)));
  assert.equal(reopened.goal.status, "ACTIVE");
});

test("addRoadmapStepAndReorder", async () => {
  const api = new FakeApi({
    goals: [{ id: 1, title: "Learn", kind: "GOAL", mode: "ROADMAP", status: "ACTIVE" }],
  });
  const a = parseResult(
    await addRoadmapStep({ goal_id: 1, name: "Step A" }, makeCtx(api))
  );
  const b = parseResult(
    await addRoadmapStep({ goal_id: 1, name: "Step B", date: "2026-10-30" }, makeCtx(api))
  );
  assert.equal(a.task.roadmap_order, 1);
  assert.equal(a.task.date, null);
  assert.equal(b.task.date, "2026-10-30");

  const reordered = parseResult(
    await reorderRoadmap({ goal_id: 1, ordered_ids: [b.task.id, a.task.id] }, makeCtx(api))
  );
  assert.deepEqual(reordered.reordered, [b.task.id, a.task.id]);
  const stepA = api.tasks.find((t) => t.id === a.task.id);
  const stepB = api.tasks.find((t) => t.id === b.task.id);
  assert.equal(stepB.roadmapOrder, 1);
  assert.equal(stepA.roadmapOrder, 2);
});

// ---------- subtasks ----------

test("subtaskLifecycle", async () => {
  const api = new FakeApi({ tasks: [makeRawTask({ id: 1 })] });
  const added = parseResult(await addSubtask({ task_id: 1, title: "Buy milk" }, makeCtx(api)));
  assert.equal(added.subtask.done, false);
  assert.equal(added.subtask.sort_order, 0);

  const updated = parseResult(
    await updateSubtask({ id: added.subtask.id, done: true }, makeCtx(api))
  );
  assert.equal(updated.subtask.done, true);

  const listed = parseResult(await listSubtasks({ task_id: 1 }, makeCtx(api)));
  assert.equal(listed.subtasks.length, 1);
  assert.equal(listed.subtasks[0].done, true);

  const deleted = parseResult(
    await deleteSubtask({ id: added.subtask.id }, makeCtx(api))
  );
  assert.equal(deleted.deleted, true);
  const after = parseResult(await listSubtasks({ task_id: 1 }, makeCtx(api)));
  assert.equal(after.subtasks.length, 0);
});

// ---------- skills ----------

test("logSkillOccurrenceRequiresDurationAndRating", async () => {
  const api = new FakeApi({
    goals: [{ id: 2, title: "Guitar", kind: "SKILL", mode: "METRIC", status: "ACTIVE" }],
  });
  const bad = runTool(logSkillOccurrence, deps(api));
  const missing = await bad({ skill_id: 2, duration_minutes: 10 });
  assert.equal(missing.isError, true);
  assert.equal(parseResult(missing).error, "invalid_rating");

  const good = parseResult(
    await logSkillOccurrence(
      { skill_id: 2, duration_minutes: 25, rating: 4, date: "2026-10-28" },
      makeCtx(api)
    )
  );
  assert.equal(good.occurrence.duration_minutes, 25);
  assert.equal(good.occurrence.rating, 4);
  assert.equal(good.occurrence.date, "2026-10-28");
});

test("skillOccurrenceUpdateAndDelete", async () => {
  const api = new FakeApi({
    goals: [{ id: 2, title: "Guitar", kind: "SKILL", mode: "METRIC", status: "ACTIVE" }],
  });
  const created = parseResult(
    await logSkillOccurrence(
      { skill_id: 2, duration_minutes: 15, rating: 3 },
      makeCtx(api)
    )
  );
  const updated = parseResult(
    await updateSkillOccurrence(
      { id: created.occurrence.id, duration_minutes: 40, rating: 5 },
      makeCtx(api)
    )
  );
  assert.equal(updated.occurrence.duration_minutes, 40);
  assert.equal(updated.occurrence.rating, 5);

  const listed = parseResult(await listSkillOccurrences({ skill_id: 2 }, makeCtx(api)));
  assert.equal(listed.occurrences.length, 1);

  const deleted = parseResult(
    await deleteSkillOccurrence({ id: created.occurrence.id }, makeCtx(api))
  );
  assert.equal(deleted.deleted, true);
  const after = parseResult(await listSkillOccurrences({ skill_id: 2 }, makeCtx(api)));
  assert.equal(after.occurrences.length, 0);
});

test("logSkillOccurrenceRejectsNonPositiveDuration", async () => {
  const api = new FakeApi({
    goals: [{ id: 2, title: "Guitar", kind: "SKILL", mode: "METRIC", status: "ACTIVE" }],
  });
  const wrapped = runTool(logSkillOccurrence, deps(api));
  const result = await wrapped({ skill_id: 2, duration_minutes: 0, rating: 3 });
  assert.equal(result.isError, true);
  assert.equal(parseResult(result).error, "invalid_duration");
});
