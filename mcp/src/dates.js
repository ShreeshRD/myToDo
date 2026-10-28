import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    return false;
  }
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    return false;
  }
  return parsed.format("YYYY-MM-DD") === value;
}

export function assertIsoDate(value, fieldName = "date") {
  if (!isIsoDate(value)) {
    const err = new Error(`${fieldName} must be a valid YYYY-MM-DD date, got ${value}`);
    err.code = "invalid_date";
    throw err;
  }
  return value;
}

export function todayInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(isoDate, days) {
  return dayjs.utc(isoDate).add(days, "day").format("YYYY-MM-DD");
}

export function weekBounds(isoDate) {
  const d = dayjs.utc(isoDate);
  const start = d.subtract((d.day() + 6) % 7, "day");
  const end = start.add(6, "day");
  return {
    start: start.format("YYYY-MM-DD"),
    end: end.format("YYYY-MM-DD"),
  };
}

export function weekBoundsForOffset(today, offset) {
  return weekBounds(addDays(today, offset * 7));
}

export function weekdayShort(isoDate) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayjs.utc(isoDate).day()];
}
