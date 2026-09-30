package com.myapp.todo;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Computes the date of the next occurrence of a recurring task.
 *
 * SPECIFIC_WEEKDAYS uses a 7-bit mask where the highest bit (64) is Monday and
 * the lowest bit (1) is Sunday, matching the frontend's CreateTaskPopup encoding.
 */
public final class RecurrenceCalculator {

    private static final int ALL_WEEKDAYS_MASK = 0b1111111;

    private RecurrenceCalculator() {
    }

    public static Optional<LocalDate> nextDate(LocalDate from, TodoItem.RepeatPattern type, Integer duration) {
        if (from == null || type == null || type == TodoItem.RepeatPattern.NONE) {
            return Optional.empty();
        }
        int n = duration == null ? 0 : duration;
        switch (type) {
            case EVERY_X_DAYS:
                return n > 0 ? Optional.of(from.plusDays(n)) : Optional.empty();
            case EVERY_X_WEEKS:
                return n > 0 ? Optional.of(from.plusWeeks(n)) : Optional.empty();
            case EVERY_X_MONTHS:
                // plusMonths clamps to the month's last day (Jan 31 + 1 month = Feb 28/29)
                return n > 0 ? Optional.of(from.plusMonths(n)) : Optional.empty();
            case SPECIFIC_WEEKDAYS:
                int mask = n & ALL_WEEKDAYS_MASK;
                if (mask == 0) {
                    return Optional.empty();
                }
                LocalDate date = from;
                for (int i = 0; i < 7; i++) {
                    date = date.plusDays(1);
                    int dayIndex = date.getDayOfWeek().getValue() - 1; // Monday = 0
                    if ((mask & (1 << (6 - dayIndex))) != 0) {
                        return Optional.of(date);
                    }
                }
                return Optional.empty();
            default:
                return Optional.empty();
        }
    }
}
