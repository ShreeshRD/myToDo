import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

export const REPEAT_TYPES = [
  "EVERY_X_DAYS",
  "EVERY_X_WEEKS",
  "EVERY_X_MONTHS",
  "SPECIFIC_WEEKDAYS",
];

export function nextOccurrence(task) {
  const { taskDate, repeatType, repeatDuration } = task;

  if (!REPEAT_TYPES.includes(repeatType)) return null;
  if (!Number.isInteger(repeatDuration) || repeatDuration <= 0) return null;

  const d = dayjs.utc(taskDate);

  switch (repeatType) {
    case "EVERY_X_DAYS":
      return d.add(repeatDuration, "day").format("YYYY-MM-DD");
    case "EVERY_X_WEEKS":
      return d.add(repeatDuration, "week").format("YYYY-MM-DD");
    case "EVERY_X_MONTHS":
      return d.add(repeatDuration, "month").format("YYYY-MM-DD");
    case "SPECIFIC_WEEKDAYS": {
      if (repeatDuration > 127) return null;
      const bits = repeatDuration.toString(2).padStart(7, "0");
      let cursor = d;
      for (let i = 0; i < 7; i++) {
        cursor = cursor.add(1, "day");
        const dayIndex = (cursor.day() + 6) % 7; // 0 = Monday, 6 = Sunday
        if (bits[dayIndex] === "1") {
          return cursor.format("YYYY-MM-DD");
        }
      }
      return null;
    }
    default:
      return null;
  }
}
