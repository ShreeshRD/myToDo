package com.myapp.todo;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RecurrenceCalculatorTest {

    private static final LocalDate TUESDAY = LocalDate.of(2026, 9, 29);

    private Optional<LocalDate> next(LocalDate from, TodoItem.RepeatPattern type, Integer n) {
        return RecurrenceCalculator.nextDate(from, type, n);
    }

    @Test
    void daysWeeksMonths() {
        assertEquals(LocalDate.of(2026, 10, 1), next(TUESDAY, TodoItem.RepeatPattern.EVERY_X_DAYS, 2).get());
        assertEquals(LocalDate.of(2026, 10, 13), next(TUESDAY, TodoItem.RepeatPattern.EVERY_X_WEEKS, 2).get());
        assertEquals(LocalDate.of(2026, 12, 29), next(TUESDAY, TodoItem.RepeatPattern.EVERY_X_MONTHS, 3).get());
    }

    @Test
    void monthEndClamps() {
        assertEquals(LocalDate.of(2026, 2, 28),
                next(LocalDate.of(2026, 1, 31), TodoItem.RepeatPattern.EVERY_X_MONTHS, 1).get());
    }

    @Test
    void zeroOrMissingDurationDoesNotRepeat() {
        assertTrue(next(TUESDAY, TodoItem.RepeatPattern.EVERY_X_DAYS, 0).isEmpty());
        assertTrue(next(TUESDAY, TodoItem.RepeatPattern.EVERY_X_WEEKS, null).isEmpty());
        assertTrue(next(TUESDAY, TodoItem.RepeatPattern.NONE, 5).isEmpty());
        assertTrue(next(TUESDAY, null, 5).isEmpty());
    }

    @Test
    void specificWeekdaysMaskHighBitIsMonday() {
        int monday = 0b1000000, wednesday = 0b0010000, sunday = 0b0000001;
        // Tuesday -> next Wednesday
        assertEquals(LocalDate.of(2026, 9, 30),
                next(TUESDAY, TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, monday | wednesday).get());
        // Tuesday -> next Monday when only Monday is set
        assertEquals(LocalDate.of(2026, 10, 5),
                next(TUESDAY, TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, monday).get());
        assertEquals(LocalDate.of(2026, 10, 4),
                next(TUESDAY, TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, sunday).get());
        // Same weekday only -> a week later
        assertEquals(LocalDate.of(2026, 10, 6),
                next(TUESDAY, TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, 0b0100000).get());
    }

    @Test
    void emptyWeekdayMaskDoesNotLoop() {
        assertTrue(next(TUESDAY, TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, 0).isEmpty());
    }
}
