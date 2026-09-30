package com.myapp.todo.reminders

import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.TimeFormats
import java.time.Instant
import java.time.ZoneId

/** Pure "when does this reminder fire" logic, kept free of Android types for unit tests. */
object ReminderCalculator {

    /** Offer list for the editor: null = none, 0 = at the task time. */
    val OPTIONS: List<Int?> = listOf(null, 0, 5, 10, 15, 30, 60, 1440)

    fun label(minutes: Int?): String = when (minutes) {
        null -> "No reminder"
        0 -> "At time of task"
        60 -> "1 hour before"
        1440 -> "1 day before"
        else -> if (minutes % 1440 == 0) "${minutes / 1440} days before"
        else if (minutes % 60 == 0) "${minutes / 60} hours before"
        else "$minutes min before"
    }

    /**
     * taskDate + assignedTime − reminderMinutesBefore in [zone], or null when the task
     * has no reminder, is complete or deleted. Subtracting on a zoned date-time handles
     * crossing midnight; whole days are subtracted on the wall clock so "1 day before"
     * keeps the same local time across a DST change.
     */
    fun triggerAt(
        taskDate: String?,
        assignedTime: String?,
        minutesBefore: Int?,
        complete: Boolean,
        deleted: Boolean,
        zone: ZoneId,
    ): Instant? {
        if (complete || deleted || minutesBefore == null || minutesBefore < 0) return null
        val date = TimeFormats.parseDate(taskDate) ?: return null
        val time = TimeFormats.parseTime(assignedTime) ?: return null
        val days = (minutesBefore / MINUTES_PER_DAY).toLong()
        val minutes = (minutesBefore % MINUTES_PER_DAY).toLong()
        return date.atTime(time).atZone(zone).minusDays(days).minusMinutes(minutes).toInstant()
    }

    fun triggerAt(task: TaskEntity, zone: ZoneId): Instant? = triggerAt(
        task.taskDate, task.assignedTime, task.reminderMinutesBefore, task.complete, task.deleted, zone,
    )

    /** Future triggers only (past ones are never scheduled), soonest first, capped at [limit]. */
    fun upcoming(
        tasks: List<TaskEntity>,
        now: Instant,
        zone: ZoneId,
        limit: Int = MAX_ALARMS,
    ): List<Pair<String, Instant>> = tasks
        .mapNotNull { task -> triggerAt(task, zone)?.takeIf { it.isAfter(now) }?.let { task.uuid to it } }
        .sortedBy { it.second }
        .take(limit)

    /** Android caps an app at ~500 pending alarms; stay well below it. */
    const val MAX_ALARMS = 100
    private const val MINUTES_PER_DAY = 1440
}
