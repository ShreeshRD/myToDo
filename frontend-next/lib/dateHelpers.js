/**
 * Formats a date string into a short format (e.g., "15 Nov")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

/**
 * Gets relative date suffix (Today, Tomorrow, or empty)
 * @param {Date} dateObject - Date to check
 * @returns {string} Suffix string with leading separator or empty
 */
export const getRelativeDateSuffix = (dateObject) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = dateObject.toDateString() === today.toDateString();
  const isTomorrow = dateObject.toDateString() === tomorrow.toDateString();

  return isToday ? ' ‧ Today' : isTomorrow ? ' ‧ Tomorrow' : '';
};

/**
 * Formats a task date for display with weekday and relative suffix
 * @param {string} date - Date string (or "Overdue")
 * @returns {string} Formatted date title
 */
export const formatTaskDate = (date) => {
  if (date === 'Overdue') return date;

  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleString('default', { 
    day: 'numeric', 
    weekday: 'short' 
  });
  const suffix = getRelativeDateSuffix(dateObject);
  
  return formattedDate + suffix;
};
