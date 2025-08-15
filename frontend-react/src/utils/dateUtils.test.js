import { formatDayAndWeekday, formatDate, generateWeekDates } from './dateUtils';
import dayjs from 'dayjs';

describe('dateUtils', () => {
  // Mock Date to control 'today' and 'tomorrow' for consistent testing
  const MOCK_DATE = new Date('2025-08-15T10:00:00Z'); // Friday, August 15, 2025

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatDayAndWeekday', () => {
    test("should format today's date correctly", () => {
      const today = dayjs(MOCK_DATE).format('YYYY-MM-DD');
      expect(formatDayAndWeekday(today)).toBe('Fri 15 ‧ Today');
    });

    test("should format tomorrow's date correctly", () => {
      const tomorrow = dayjs(MOCK_DATE).add(1, 'day').format('YYYY-MM-DD');
      expect(formatDayAndWeekday(tomorrow)).toBe('Sat 16 ‧ Tomorrow');
    });

    test('should format a future date correctly (not today or tomorrow)', () => {
      const futureDate = dayjs(MOCK_DATE).add(5, 'day').format('YYYY-MM-DD');
      expect(formatDayAndWeekday(futureDate)).toBe('Wed 20');
    });

    test('should format a past date correctly (not today or tomorrow)', () => {
      const pastDate = dayjs(MOCK_DATE).subtract(5, 'day').format('YYYY-MM-DD');
      expect(formatDayAndWeekday(pastDate)).toBe('Sun 10');
    });
  });

  describe('formatDate', () => {
    test('should format a standard date correctly', () => {
      expect(formatDate('2025-01-20')).toBe('20 Jan');
    });

    test('should format a date with a different month correctly', () => {
      expect(formatDate('2025-07-05')).toBe('5 Jul');
    });
  });

  describe('generateWeekDates', () => {
    test('should generate 7 consecutive dates starting from the given date', () => {
      const startDate = dayjs('2025-08-15');
      const weekDates = generateWeekDates(startDate);

      expect(weekDates).toHaveLength(7);
      expect(weekDates[0]).toBe('2025-08-15');
      expect(weekDates[1]).toBe('2025-08-16');
      expect(weekDates[6]).toBe('2025-08-21');
    });
  });
});
