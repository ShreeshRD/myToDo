import test from "node:test";
import assert from "node:assert/strict";
import { compactTask, groupWeek, normalizeProject } from "../src/tasks.js";
import { makeRawTask } from "./fixtures.js";

const TODAY = "2026-10-28";

test("compactTaskMapsFields", () => {
  const raw = makeRawTask({
    assignedTime: "09:15:00",
    complete: true,
  });
  const compact = compactTask(raw, TODAY);
  assert.deepEqual(compact, {
    id: 1,
    name: "Take daily photo",
    date: "2026-10-28",
    project: "Personal",
    priority: 0,
    complete: true,
    in_progress: false,
    long_term: false,
    repeat: "EVERY_X_DAYS",
    overdue: false,
    completed_at: "09:15:00",
  });
});

test("compactTaskNullCategory", () => {
  const compact = compactTask(makeRawTask({ category: null, repeatType: "NONE" }), TODAY);
  assert.equal(compact.project, "None");
});

test("compactTaskNoneRepeat", () => {
  assert.equal(compactTask(makeRawTask({ repeatType: null }), TODAY).repeat, null);
  assert.equal(compactTask(makeRawTask({ repeatType: "NONE" }), TODAY).repeat, null);
});

test("compactTaskCompletedAt", () => {
  assert.equal(
    compactTask(makeRawTask({ complete: true, assignedTime: null }), TODAY).completed_at,
    undefined
  );
  assert.equal(
    compactTask(makeRawTask({ complete: false, assignedTime: "09:15:00" }), TODAY)
      .completed_at,
    undefined
  );
  assert.equal(
    compactTask(makeRawTask({ complete: true, assignedTime: "null" }), TODAY)
      .completed_at,
    undefined
  );
});

test("compactTaskOverduePastOpen", () => {
  const compact = compactTask(makeRawTask({ taskDate: "2026-10-27", complete: false }), TODAY);
  assert.equal(compact.overdue, true);
});

test("compactTaskNotOverdueCompleted", () => {
  const compact = compactTask(makeRawTask({ taskDate: "2026-10-27", complete: true }), TODAY);
  assert.equal(compact.overdue, false);
});

test("compactTaskNotOverdueFuture", () => {
  const compact = compactTask(makeRawTask({ taskDate: "2026-10-29", complete: false }), TODAY);
  assert.equal(compact.overdue, false);
});

test("groupWeekSevenDays", () => {
  const days = groupWeek([], "2026-10-26", TODAY);
  assert.equal(days.length, 7);
  assert.deepEqual(
    days.map((d) => d.weekday),
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  );
  assert.equal(days[0].date, "2026-10-26");
  assert.equal(days[6].date, "2026-11-01");
});

test("groupWeekEmptyDays", () => {
  const days = groupWeek([], "2026-10-26", TODAY);
  for (const day of days) {
    assert.deepEqual(day.tasks, []);
    assert.deepEqual(day.counts, { total: 0, open: 0, completed: 0 });
  }
});

test("groupWeekSortsDayOrder", () => {
  const tasks = [
    makeRawTask({ id: 1, dayOrder: 3, name: "C" }),
    makeRawTask({ id: 2, dayOrder: 1, name: "A" }),
    makeRawTask({ id: 3, dayOrder: 2, name: "B" }),
  ];
  const days = groupWeek(tasks, "2026-10-26", TODAY);
  const wed = days.find((d) => d.date === "2026-10-28");
  assert.deepEqual(
    wed.tasks.map((t) => t.name),
    ["A", "B", "C"]
  );
});

test("normalizeProjectBlank", () => {
  assert.equal(normalizeProject(null), "None");
  assert.equal(normalizeProject(""), "None");
  assert.equal(normalizeProject("  "), "None");
  assert.equal(normalizeProject(" Personal "), "Personal");
});
