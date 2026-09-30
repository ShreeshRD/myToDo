package com.myapp.todo.ui

import com.myapp.todo.data.RepeatType
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.WeekdayMask
import com.myapp.todo.ui.editor.TaskDraft
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime

class TaskGroupingTest {
    private val today = LocalDate.of(2026, 9, 29)

    private fun t(uuid: String, date: String?, time: String? = null, order: Int? = null, complete: Boolean = false, category: String = "Home") =
        TaskEntity(uuid = uuid, name = uuid, taskDate = date, assignedTime = time, dayOrder = order, complete = complete, category = category)

    @Test
    fun todaySplitsOverdueTodayAndCompleted() {
        val state = TaskGrouping.today(
            listOf(
                t("late", "2026-09-27"),
                t("late-done", "2026-09-27", complete = true),
                t("untimed-2", "2026-09-29", order = 2),
                t("untimed-1", "2026-09-29", order = 1),
                t("at-9", "2026-09-29", time = "09:00:00", order = 5),
                t("at-8", "2026-09-29", time = "08:00:00", order = 9),
                t("done", "2026-09-29", complete = true),
                t("tomorrow", "2026-09-30"),
                t("undated", null),
            ),
            today,
        )
        assertEquals(listOf("late"), state.overdue.map { it.uuid })
        assertEquals(listOf("at-8", "at-9", "untimed-1", "untimed-2"), state.today.map { it.uuid })
        assertEquals(listOf("done"), state.completed.map { it.uuid })
    }

    @Test
    fun upcomingGroupsByDateSkippingEmptyDaysAndCompleted() {
        val groups = TaskGrouping.upcoming(
            listOf(
                t("a", "2026-10-02"), t("b", "2026-09-29"), t("c", "2026-10-02", time = "07:00:00"),
                t("done", "2026-09-30", complete = true), t("past", "2026-09-28"), t("far", "2026-12-01"),
            ),
            today,
        )
        assertEquals(listOf(LocalDate.of(2026, 9, 29), LocalDate.of(2026, 10, 2)), groups.map { it.date })
        assertEquals(listOf("c", "a"), groups[1].tasks.map { it.uuid })
    }

    @Test
    fun searchFiltersByTextAndState() {
        val tasks = listOf(t("Buy milk", "2026-09-29"), t("Milk run", "2026-09-28", complete = true), t("Gym", "2026-09-29", category = "Personal"))
        assertEquals(listOf("Buy milk", "Milk run"), TaskGrouping.search(tasks, "milk", SearchFilter.ALL).map { it.uuid })
        assertEquals(listOf("Buy milk"), TaskGrouping.search(tasks, "MILK", SearchFilter.ACTIVE).map { it.uuid })
        assertEquals(listOf("Milk run"), TaskGrouping.search(tasks, "", SearchFilter.COMPLETED).map { it.uuid })
        assertEquals(listOf("Gym"), TaskGrouping.search(tasks, "personal", SearchFilter.ALL).map { it.uuid })
    }

    @Test
    fun projectsIncludeDefaultsOnce() {
        assertEquals(listOf("Home", "Office", "Personal", "Side"), TaskGrouping.projects(listOf("home", "Side")))
    }

    @Test
    fun draftBuildsEntity() {
        val draft = TaskDraft(null, date = today).copy(
            name = "  Standup ", time = LocalTime.of(9, 30), reminderMinutes = 10, project = "Office", priority = 1,
            repeatType = RepeatType.SPECIFIC_WEEKDAYS,
            weekdayMask = WeekdayMask.of(listOf(DayOfWeek.MONDAY, DayOfWeek.FRIDAY)),
        )
        val e = draft.toEntity()
        assertEquals("Standup", e.name)
        assertEquals("2026-09-29", e.taskDate)
        assertEquals("09:30:00", e.assignedTime)
        assertEquals(10, e.reminderMinutesBefore)
        assertEquals(68, e.repeatDuration)
        assertEquals("", e.uuid) // repository assigns one
    }

    @Test
    fun draftWithoutTimeDropsReminder() {
        val existing = t("x", "2026-09-29", time = "10:00:00", order = 3).copy(reminderMinutesBefore = 5)
        val draft = TaskDraft(existing).copy(time = null)
        val e = draft.toEntity()
        assertNull(e.assignedTime)
        assertNull(e.reminderMinutesBefore)
        assertEquals(3, e.dayOrder) // same day keeps its position
        assertEquals(null, TaskDraft(existing).copy(date = today.plusDays(1)).toEntity().dayOrder)
    }

    @Test
    fun draftValidation() {
        assertFalse(TaskDraft(null).copy(name = " ").canSave)
        assertTrue(TaskDraft(null).copy(name = "x").canSave)
        assertFalse(TaskDraft(null).copy(name = "x", repeatType = RepeatType.SPECIFIC_WEEKDAYS, weekdayMask = 0).canSave)
    }
}
