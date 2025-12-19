import dayjs from "dayjs";

/**
 * Formats a date string into a short format (e.g., "15 Nov")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDateShort = (dateString) => {
  return dayjs(dateString).format('D MMM');
};

/**
 * Gets relative date suffix (Today, Tomorrow, or empty)
 * @param {dayjs.Dayjs} dateObject - Dayjs object to check
 * @returns {string} Suffix string with leading separator or empty
 */
export const getRelativeDateSuffix = (dateObject) => {
  const today = dayjs();
  const tomorrow = dayjs().add(1, 'day');

  const isToday = dateObject.isSame(today, 'day');
  // Compare by day to ignore time parts
  const isTomorrow = dateObject.isSame(tomorrow, 'day');

  return isToday ? ' ‧ Today' : isTomorrow ? ' ‧ Tomorrow' : '';
};

/**
 * Formats a task date for display with weekday and relative suffix
 * @param {string} date - Date string (or "Overdue")
 * @returns {string} Formatted date title
 */
export const formatTaskDate = (date) => {
  if (date === 'Overdue') return date;

  const dateObject = dayjs(date);
  const formattedDate = dateObject.format('ddd D MMM');

  const suffix = getRelativeDateSuffix(dateObject);

  return formattedDate + suffix;
};

