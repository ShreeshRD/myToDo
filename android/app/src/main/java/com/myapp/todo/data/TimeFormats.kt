package com.myapp.todo.data

import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/** The backend's wire formats: taskDate "yyyy-MM-dd", assignedTime "HH:mm:ss". */
object TimeFormats {
    private val TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")

    fun parseDate(value: String?): LocalDate? = try {
        value?.takeIf { it.isNotBlank() }?.let { LocalDate.parse(it.take(10)) }
    } catch (_: DateTimeParseException) {
        null
    }

    fun formatDate(date: LocalDate): String = date.toString()

    /** Accepts "HH:mm" or "HH:mm:ss" (and fractional seconds); null/blank means no time. */
    fun parseTime(value: String?): LocalTime? = try {
        value?.takeIf { it.isNotBlank() }?.let { LocalTime.parse(it) }
    } catch (_: DateTimeParseException) {
        null
    }

    fun formatTime(time: LocalTime): String = time.withNano(0).format(TIME)

    /** Canonicalises a server time string to "HH:mm:ss", or null when absent/invalid. */
    fun normalizeTime(value: String?): String? = parseTime(value)?.let(::formatTime)
}
