import dayjs from "dayjs";

/**
 * Format a date string to show day and weekday
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatDayAndWeekday = (date) => {
  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleString("default", { day: "numeric", weekday: "short" });
  
  // Check if the date is today or tomorrow
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = dateObject.toDateString() === today.toDateString();
  const isTomorrow = dateObject.toDateString() === tomorrow.toDateString();

  const suffix = isToday ? " ‧ Today" : isTomorrow ? " ‧ Tomorrow" : "";
  return formattedDate + suffix;
};

/**
 * Format a date to show day and month
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

/**
 * Generate an array of dates for the upcoming week
 * @param {dayjs} startDate - Starting date
 * @returns {string[]} Array of dates in YYYY-MM-DD format
 */
export const generateWeekDates = (startDate) => {
  return Array.from({ length: 7 }, (_, index) => {
    const date = startDate.add(index, 'day');
    return date.format('YYYY-MM-DD');
  });
};