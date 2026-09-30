package com.myapp.todo.reminders

import com.myapp.todo.data.TaskEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

class ReminderCalculatorTest {
    private val kolkata = ZoneId.of("Asia/Kolkata")
    private val london = ZoneId.of("Europe/London")

    private fun at(zone: ZoneId, y: Int, m: Int, d: Int, h: Int, min: Int): Instant =
        ZonedDateTime.of(y, m, d, h, min, 0, 0, zone).toInstant()

    private fun task(date: String?, time: String?, before: Int?, complete: Boolean = false, deleted: Boolean = false, uuid: String = "t") =
        TaskEntity(uuid = uuid, name = uuid, taskDate = date, assignedTime = time, reminderMinutesBefore = before,
            complete = complete, deleted = deleted)

    @Test
    fun subtractsMinutesInLocalZone() {
        assertEquals(at(kolkata, 2026, 9, 29, 9, 15), ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", 15), kolkata))
        assertEquals(at(kolkata, 2026, 9, 29, 9, 30), ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", 0), kolkata))
    }

    @Test
    fun crossesMidnightWhenRemindingEarly() {
        // 00:10 task with a 30 min reminder fires the previous evening
        assertEquals(at(kolkata, 2026, 9, 28, 23, 40), ReminderCalculator.triggerAt(task("2026-09-29", "00:10:00", 30), kolkata))
        // "1 day before" lands on the previous date at the same time
        assertEquals(at(kolkata, 2026, 9, 28, 8, 0), ReminderCalculator.triggerAt(task("2026-09-29", "08:00:00", 1440), kolkata))
        // Across a month/year boundary
        assertEquals(at(kolkata, 2026, 12, 31, 23, 0), ReminderCalculator.triggerAt(task("2027-01-01", "00:00:00", 60), kolkata))
    }

    @Test
    fun usesWallClockAcrossDst() {
        // UK clocks go back on 25 Oct 2026; 1 day before 09:00 is still 09:00 local
        assertEquals(at(london, 2026, 10, 24, 9, 0), ReminderCalculator.triggerAt(task("2026-10-25", "09:00:00", 1440), london))
        // Sub-day offsets are real elapsed time: 01:30 GMT minus 60 min = 01:30 BST on the same night
        assertEquals(at(london, 2026, 10, 25, 1, 30).minusSeconds(3600), ReminderCalculator.triggerAt(task("2026-10-25", "01:30:00", 60), london))
    }

    @Test
    fun noReminderCases() {
        assertNull(ReminderCalculator.triggerAt(task("2026-09-29", null, 15), kolkata))
        assertNull(ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", null), kolkata))
        assertNull(ReminderCalculator.triggerAt(task(null, "09:30:00", 15), kolkata))
        assertNull(ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", 15, complete = true), kolkata))
        assertNull(ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", 15, deleted = true), kolkata))
        assertNull(ReminderCalculator.triggerAt(task("2026-09-29", "09:30:00", -5), kolkata))
    }

    @Test
    fun upcomingSkipsPastAndSortsSoonestFirst() {
        val now = at(kolkata, 2026, 9, 29, 12, 0)
        val tasks = listOf(
            task("2026-09-29", "11:00:00", 0, uuid = "past"),
            task("2026-09-29", "12:00:00", 0, uuid = "exactly-now"),
            task("2026-09-30", "09:00:00", 0, uuid = "tomorrow"),
            task("2026-09-29", "13:00:00", 30, uuid = "soon"),
            task("2026-09-30", "10:00:00", 1440, uuid = "day-before-past"), // 29th 10:00 < now
            task("2026-09-29", "18:00:00", null, uuid = "none"),
        )
        val result = ReminderCalculator.upcoming(tasks, now, kolkata)
        assertEquals(listOf("soon", "tomorrow"), result.map { it.first })
        assertEquals(at(kolkata, 2026, 9, 29, 12, 30), result[0].second)
    }

    @Test
    fun upcomingIsCapped() {
        val now = at(kolkata, 2026, 1, 1, 0, 0)
        val tasks = (1..150).map { task("2026-02-01", "%02d:%02d:00".format(it / 60, it % 60), 0, uuid = "t$it") }
        assertEquals(ReminderCalculator.MAX_ALARMS, ReminderCalculator.upcoming(tasks, now, kolkata).size)
    }

    @Test
    fun labels() {
        assertEquals("At time of task", ReminderCalculator.label(0))
        assertEquals("15 min before", ReminderCalculator.label(15))
        assertEquals("1 hour before", ReminderCalculator.label(60))
        assertEquals("1 day before", ReminderCalculator.label(1440))
        assertEquals("2 hours before", ReminderCalculator.label(120))
    }
}
