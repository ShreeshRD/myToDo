/**
 * Formats a repeat type from backend format to display format
 * @param {string} repeatType - The repeat type in UPPER_SNAKE_CASE format
 * @returns {string} The formatted repeat type
 */
export const formatRepeatType = (repeatType) => {
  return repeatType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Processes custom repeat value into weekday selection state
 * @param {number} repeatVal - Binary representation of selected weekdays
 * @param {Array} currentDays - Current weekday configuration
 * @returns {Array} Updated weekday configuration with checked states
 */
export const processCustomRepeat = (repeatVal, currentDays) => {
  const binaryString = repeatVal.toString(2).padStart(7, '0');
  const updatedDays = currentDays.map((day, index) => ({
    ...day,
    checked: binaryString[index] === '1'
  }));
  return updatedDays;
};

/**
 * Converts priority selection to numeric value
 * @param {string} selectedPriority - Priority string (e.g., 'P1', 'Priority')
 * @param {Object} priorityMap - Mapping of priority strings to values
 * @returns {number} Priority value
 */
export const getPriorityValue = (selectedPriority, priorityMap) => {
  return priorityMap[selectedPriority] || 0;
};

/**
 * Converts repeat type selection to backend format
 * @param {string} repeatType - Display format repeat type
 * @param {Object} repeatMap - Mapping of display names to backend values
 * @returns {string} Backend repeat type value
 */
export const getRepeatTypeValue = (repeatType, repeatMap) => {
  return repeatMap[repeatType] || 'NONE';
};

/**
 * Calculates repeat duration based on type and inputs
 * @param {string} repeatTypeValue - Backend repeat type value
 * @param {string} repeatDuration - User input duration
 * @param {number} repeatCustom - Binary weekday selection for SPECIFIC_WEEKDAYS
 * @returns {number} Repeat duration value
 */
export const getRepeatDuration = (repeatTypeValue, repeatDuration, repeatCustom) => {
  if (repeatTypeValue === 'NONE') return 0;
  if (repeatTypeValue === 'SPECIFIC_WEEKDAYS') return repeatCustom;
  return repeatDuration === '' ? 1 : parseInt(repeatDuration, 10);
};
