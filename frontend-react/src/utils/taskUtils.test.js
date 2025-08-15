import { processCustomRepeat, formatRepeatType, calculateRepeatCustom } from './taskUtils';

describe('taskUtils', () => {
  describe('processCustomRepeat', () => {
    const initialDays = [
      { day: 'Monday', checked: false },
      { day: 'Tuesday', checked: false },
      { day: 'Wednesday', checked: false },
      { day: 'Thursday', checked: false },
      { day: 'Friday', checked: false },
      { day: 'Saturday', checked: false },
      { day: 'Sunday', checked: false },
    ];

    test('should correctly process repeatVal for a few checked days', () => {
      // Binary for Monday (index 0) and Wednesday (index 2) checked: 0101000 (from right to left, Sunday is 0)
      // Correct binary for Monday (index 0) and Wednesday (index 2) checked: 1010000 (from left to right, Monday is 0)
      // Let's assume the binary string is from left to right (Monday to Sunday)
      // So, if Monday and Wednesday are checked, it's 1010000 (binary 80 in decimal)
      const repeatVal = 80; // Binary 01010000 (Monday, Wednesday)
      const expectedDays = [
        { day: 'Monday', checked: true },
        { day: 'Tuesday', checked: false },
        { day: 'Wednesday', checked: true },
        { day: 'Thursday', checked: false },
        { day: 'Friday', checked: false },
        { day: 'Saturday', checked: false },
        { day: 'Sunday', checked: false },
      ];
      expect(processCustomRepeat(repeatVal, initialDays)).toEqual(expectedDays);
    });

    test('should correctly process repeatVal for all checked days', () => {
      const repeatVal = 127; // Binary 1111111
      const expectedDays = initialDays.map(day => ({ ...day, checked: true }));
      expect(processCustomRepeat(repeatVal, initialDays)).toEqual(expectedDays);
    });

    test('should correctly process repeatVal for no checked days', () => {
      const repeatVal = 0;
      const expectedDays = initialDays.map(day => ({ ...day, checked: false }));
      expect(processCustomRepeat(repeatVal, initialDays)).toEqual(expectedDays);
    });

    test('should handle an empty days array gracefully', () => {
      const repeatVal = 10;
      expect(processCustomRepeat(repeatVal, [])).toEqual([]);
    });
  });

  describe('formatRepeatType', () => {
    test('should format EVERY_X_DAYS correctly', () => {
      expect(formatRepeatType('EVERY_X_DAYS')).toBe('Every X Days');
    });

    test('should format SPECIFIC_WEEKDAYS correctly', () => {
      expect(formatRepeatType('SPECIFIC_WEEKDAYS')).toBe('Specific Weekdays');
    });

    test('should format NONE correctly', () => {
      expect(formatRepeatType('NONE')).toBe('None');
    });

    test('should handle mixed case input correctly', () => {
      expect(formatRepeatType('every_x_weeks')).toBe('Every X Weeks');
    });
  });

  describe('calculateRepeatCustom', () => {
    const initialDays = [
      { day: 'Monday', checked: false },
      { day: 'Tuesday', checked: false },
      { day: 'Wednesday', checked: false },
      { day: 'Thursday', checked: false },
      { day: 'Friday', checked: false },
      { day: 'Saturday', checked: false },
      { day: 'Sunday', checked: false },
    ];

    test('should toggle a day from unchecked to checked and update repeatCustom', () => {
      const currentIndex = 0; // Monday
      const currentRepeatCustom = 0;
      const { days, repeatCustom } = calculateRepeatCustom(initialDays, currentIndex, currentRepeatCustom);
      expect(days[currentIndex].checked).toBe(true);
      expect(repeatCustom).toBe(64); // 2^6
    });

    test('should toggle a day from checked to unchecked and update repeatCustom', () => {
      const checkedDays = initialDays.map((day, index) => ({ ...day, checked: index === 0 })); // Monday checked
      const currentIndex = 0; // Monday
      const currentRepeatCustom = 64;
      const { days, repeatCustom } = calculateRepeatCustom(checkedDays, currentIndex, currentRepeatCustom);
      expect(days[currentIndex].checked).toBe(false);
      expect(repeatCustom).toBe(0);
    });

    test('should handle different currentIndex values', () => {
      const currentIndex = 3; // Thursday
      const currentRepeatCustom = 0;
      const { days, repeatCustom } = calculateRepeatCustom(initialDays, currentIndex, currentRepeatCustom);
      expect(days[currentIndex].checked).toBe(true);
      expect(repeatCustom).toBe(8); // 2^3
    });

    test('should handle empty days array gracefully', () => {
      const currentIndex = 0;
      const currentRepeatCustom = 0;
      const { days, repeatCustom } = calculateRepeatCustom([], currentIndex, currentRepeatCustom);
      expect(days).toEqual([]);
      expect(repeatCustom).toBe(0); // No change to repeatCustom if days array is empty
    });
  });
});
