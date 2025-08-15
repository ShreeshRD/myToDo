/**
 * Process custom repeat settings for specific weekdays
 * @param {number} repeatVal - The repeat value as a number
 * @param {Array} days - Array of day objects
 * @returns {Array} Updated days array
 */
export const processCustomRepeat = (repeatVal, days) => {
  const binaryString = repeatVal.toString(2).padStart(7, '0');
  const updatedDays = days.map((day, index) => ({
    ...day,
    checked: binaryString[index] === '1'
  }));
  return updatedDays;
};

/**
 * Format repeat type from internal format to display format
 * @param {string} repeatType - Internal repeat type
 * @returns {string} Formatted repeat type
 */
export const formatRepeatType = (repeatType) => {
  return repeatType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Calculate repeat custom value based on selected days
 * @param {Array} days - Array of day objects with checked property
 * @param {number} currentIndex - Index of the day being toggled
 * @param {number} currentRepeatCustom - Current repeat custom value
 * @returns {number} Updated repeat custom value
 */
export const calculateRepeatCustom = (days, currentIndex, currentRepeatCustom) => {
  if (!days || days.length === 0) {
    return { days: [], repeatCustom: currentRepeatCustom };
  }
  const updatedDays = days.map((day, i) =>
    i === currentIndex ? { ...day, checked: !day.checked } : day
  );
  const newVal = currentRepeatCustom + (days[currentIndex].checked ? -1 : 1) * 2 ** (6 - currentIndex);
  return { days: updatedDays, repeatCustom: newVal };
};