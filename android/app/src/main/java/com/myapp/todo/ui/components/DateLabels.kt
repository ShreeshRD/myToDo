package com.myapp.todo.ui.components

import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object DateLabels {
    // Built per call so a locale change while the app runs is picked up
    private fun dayFormat() = DateTimeFormatter.ofPattern("EEE d MMM", Locale.getDefault())

    /** "Tue 29 Sep · Today" */
    fun header(date: LocalDate, today: LocalDate): String {
        val base = date.format(dayFormat())
        return when (date) {
            today -> "$base · Today"
            today.plusDays(1) -> "$base · Tomorrow"
            else -> base
        }
    }

    /** Short date for a meta line: Today / Tomorrow / Yesterday / "Tue 29 Sep". */
    fun short(date: LocalDate, today: LocalDate): String = when (date) {
        today -> "Today"
        today.plusDays(1) -> "Tomorrow"
        today.minusDays(1) -> "Yesterday"
        else -> date.format(dayFormat())
    }

    fun time(time: LocalTime): String = time.format(DateTimeFormatter.ofPattern("HH:mm"))
}
