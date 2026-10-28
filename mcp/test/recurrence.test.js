import test from "node:test";
import assert from "node:assert/strict";
import { nextOccurrence } from "../src/recurrence.js";

function task(taskDate, repeatType, repeatDuration) {
  return { taskDate, repeatType, repeatDuration };
}

test("everyXDays", () => {
  assert.equal(
    nextOccurrence(task("2026-10-28", "EVERY_X_DAYS", 1)),
    "2026-10-29"
  );
});

test("everyXWeeks", () => {
  assert.equal(
    nextOccurrence(task("2026-10-28", "EVERY_X_WEEKS", 2)),
    "2026-11-11"
  );
});

test("everyXMonthsClampNonLeap", () => {
  assert.equal(
    nextOccurrence(task("2026-01-31", "EVERY_X_MONTHS", 1)),
    "2026-02-28"
  );
});

test("everyXMonthsClampLeap", () => {
  assert.equal(
    nextOccurrence(task("2024-01-31", "EVERY_X_MONTHS", 1)),
    "2024-02-29"
  );
});

test("everyXMonthsYearBoundary", () => {
  assert.equal(
    nextOccurrence(task("2026-12-31", "EVERY_X_MONTHS", 1)),
    "2027-01-31"
  );
});

test("specificWeekdaysMonToFri", () => {
  // Fri 2026-10-30, bitmask 124 = Mon-Fri
  assert.equal(
    nextOccurrence(task("2026-10-30", "SPECIFIC_WEEKDAYS", 124)),
    "2026-11-02"
  );
});

test("specificWeekdaysMonWedFri", () => {
  // Tue 2026-10-27, bitmask 84 = Mon+Wed+Fri
  assert.equal(
    nextOccurrence(task("2026-10-27", "SPECIFIC_WEEKDAYS", 84)),
    "2026-10-28"
  );
});

test("specificWeekdaysSundayOnly", () => {
  // Sun 2026-11-01, bitmask 1 = Sunday only → next Sunday
  assert.equal(
    nextOccurrence(task("2026-11-01", "SPECIFIC_WEEKDAYS", 1)),
    "2026-11-08"
  );
});

test("specificWeekdaysZero", () => {
  assert.equal(nextOccurrence(task("2026-10-28", "SPECIFIC_WEEKDAYS", 0)), null);
});

test("noneReturnsNull", () => {
  assert.equal(nextOccurrence(task("2026-10-28", "NONE", 1)), null);
});

test("nullReturnsNull", () => {
  assert.equal(nextOccurrence(task("2026-10-28", null, 1)), null);
});

test("zeroDurationReturnsNull", () => {
  assert.equal(nextOccurrence(task("2026-10-28", "EVERY_X_DAYS", 0)), null);
});

test("negativeDurationReturnsNull", () => {
  assert.equal(nextOccurrence(task("2026-10-28", "EVERY_X_DAYS", -1)), null);
});

test("bitmaskOver127ReturnsNull", () => {
  assert.equal(nextOccurrence(task("2026-10-28", "SPECIFIC_WEEKDAYS", 128)), null);
});

test("doesNotMutateInput", () => {
  const t = task("2026-10-28", "EVERY_X_DAYS", 1);
  const snapshot = { ...t };
  nextOccurrence(t);
  assert.deepEqual(t, snapshot);
});
