/**
 * Priority mapping constants
 */
export const PRIORITY_MAP = {
  'Priority': 0,
  'P0': 0,
  'P1': 1,
  'P2': 2,
  'P3': 3,
  'P4': 4
};

/**
 * Repeat type mapping constants
 */
export const REPEAT_TYPE_MAP = {
  'Repeat Type': 'NONE',
  'Off': 'NONE',
  'Every X Days': 'EVERY_X_DAYS',
  'Every X Weeks': 'EVERY_X_WEEKS',
  'Every X Months': 'EVERY_X_MONTHS',
  'Specific Weekdays': 'SPECIFIC_WEEKDAYS'
};

/**
 * Available priority levels
 */
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];

/**
 * Available repeat options
 */
export const REPEAT_OPTIONS = [
  'Off',
  'Every X Days',
  'Every X Weeks',
  'Every X Months',
  'Specific Weekdays'
];

/**
 * Weekday configuration for custom repeat
 */
export const WEEKDAYS = [
  { day: 'Monday', checked: false },
  { day: 'Tuesday', checked: false },
  { day: 'Wednesday', checked: false },
  { day: 'Thursday', checked: false },
  { day: 'Friday', checked: false },
  { day: 'Saturday', checked: false },
  { day: 'Sunday', checked: false }
];
