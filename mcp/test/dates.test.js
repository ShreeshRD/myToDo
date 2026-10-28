import test from "node:test";
import assert from "node:assert/strict";
import {
  todayInZone,
  weekBounds,
  weekBoundsForOffset,
  weekdayShort,
  addDays,
  isIsoDate,
} from "../src/dates.js";

test("todayInZoneBeforeMidnight", () => {
  const now = new Date("2026-10-28T18:29:59Z");
  assert.equal(todayInZone(now, "Asia/Kolkata"), "2026-10-28");
});

test("todayInZoneAtMidnight", () => {
  const now = new Date("2026-10-28T18:30:00Z");
  assert.equal(todayInZone(now, "Asia/Kolkata"), "2026-10-29");
});

test("todayInZoneMorning", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(todayInZone(now, "Asia/Kolkata"), "2026-01-01");
});

test("weekBoundsWednesday", () => {
  assert.deepEqual(weekBounds("2026-10-28"), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
});

test("weekBoundsMonday", () => {
  assert.deepEqual(weekBounds("2026-10-26"), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
});

test("weekBoundsSunday", () => {
  assert.deepEqual(weekBounds("2026-11-01"), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
});

test("weekBoundsYearBoundary", () => {
  assert.deepEqual(weekBounds("2026-12-31"), {
    start: "2026-12-28",
    end: "2027-01-03",
  });
});

test("weekOffsetNext", () => {
  assert.deepEqual(weekBoundsForOffset("2026-10-28", 1), {
    start: "2026-11-02",
    end: "2026-11-08",
  });
});

test("weekOffsetPrevious", () => {
  assert.deepEqual(weekBoundsForOffset("2026-10-28", -1), {
    start: "2026-10-19",
    end: "2026-10-25",
  });
});

test("weekdayShort", () => {
  assert.equal(weekdayShort("2026-10-26"), "Mon");
  assert.equal(weekdayShort("2026-11-01"), "Sun");
});

test("addDaysYearBoundary", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("isIsoDateValid", () => {
  assert.equal(isIsoDate("2026-10-28"), true);
});

test("isIsoDateRejectsImpossible", () => {
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
});

test("isIsoDateRejectsFormat", () => {
  assert.equal(isIsoDate("2026-2-3"), false);
  assert.equal(isIsoDate("10/28/2026"), false);
});
