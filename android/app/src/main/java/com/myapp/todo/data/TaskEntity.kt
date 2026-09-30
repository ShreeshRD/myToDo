package com.myapp.todo.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.LocalTime

/**
 * Local mirror of the backend TodoItem, keyed by the client-generated uuid.
 * Dates and times keep the wire formats ("yyyy-MM-dd", "HH:mm:ss"), which also sort correctly.
 */
@Entity(tableName = "tasks", indices = [Index("taskDate"), Index("dirty")])
data class TaskEntity(
    @PrimaryKey val uuid: String,
    /** Server id; null until the task has been pushed. */
    val serverId: Long? = null,
    val name: String,
    /** The "project", e.g. Home. */
    val category: String = "Home",
    val taskDate: String?,
    val dayOrder: Int? = null,
    val complete: Boolean = false,
    /** 1 = highest … 4 = lowest, 0 = none. */
    val priority: Int = 0,
    val repeatType: RepeatType = RepeatType.NONE,
    val repeatDuration: Int = 0,
    val assignedTime: String? = null,
    val inProgress: Boolean = false,
    val longTerm: Boolean = false,
    val timeTaken: Long? = null,
    val reminderMinutesBefore: Int? = null,
    val updatedAt: Long = 0,
    /** Tombstone: hidden from the UI, pushed so the server learns about the delete. */
    val deleted: Boolean = false,
    /** Changed locally and not yet acknowledged by the server. */
    val dirty: Boolean = false,
) {
    val date: LocalDate? get() = TimeFormats.parseDate(taskDate)
    val time: LocalTime? get() = TimeFormats.parseTime(assignedTime)
    val hasReminder: Boolean get() = assignedTime != null && reminderMinutesBefore != null
    val isRepeating: Boolean get() = repeatType != RepeatType.NONE
}
