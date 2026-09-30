package com.myapp.todo.data

import java.time.DayOfWeek
import java.time.format.TextStyle
import java.util.Locale

/**
 * SPECIFIC_WEEKDAYS encoding shared with the backend and web app:
 * a 7-bit mask where bit 64 is Monday and bit 1 is Sunday.
 */
object WeekdayMask {
    const val ALL = 0b1111111

    /** Monday first, the order the bits are laid out in. */
    val ORDER: List<DayOfWeek> = DayOfWeek.entries

    fun bit(day: DayOfWeek): Int = 1 shl (7 - day.value)

    fun contains(mask: Int, day: DayOfWeek): Boolean = mask and bit(day) != 0

    fun toggle(mask: Int, day: DayOfWeek): Int = (mask xor bit(day)) and ALL

    fun of(days: Collection<DayOfWeek>): Int = days.fold(0) { acc, d -> acc or bit(d) }

    fun days(mask: Int): List<DayOfWeek> = ORDER.filter { contains(mask, it) }

    fun label(mask: Int, locale: Locale = Locale.getDefault()): String = when (mask and ALL) {
        0 -> "No days"
        ALL -> "Every day"
        of(ORDER.take(5)) -> "Weekdays"
        of(ORDER.takeLast(2)) -> "Weekends"
        else -> days(mask).joinToString(", ") { it.getDisplayName(TextStyle.SHORT, locale) }
    }
}
