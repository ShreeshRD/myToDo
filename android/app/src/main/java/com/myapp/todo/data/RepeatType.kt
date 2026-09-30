package com.myapp.todo.data

/** Mirrors the backend's TodoItem.RepeatPattern. Recurrence itself is computed server-side. */
enum class RepeatType {
    NONE,
    EVERY_X_DAYS,
    EVERY_X_WEEKS,
    EVERY_X_MONTHS,
    SPECIFIC_WEEKDAYS;

    companion object {
        fun parse(value: String?): RepeatType =
            entries.firstOrNull { it.name == value } ?: NONE
    }
}
