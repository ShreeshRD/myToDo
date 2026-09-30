package com.myapp.todo.ui.editor

import com.myapp.todo.data.RepeatType
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.TimeFormats
import com.myapp.todo.data.WeekdayMask
import java.time.LocalDate
import java.time.LocalTime

/** Editable form state; [toEntity] folds it back into the stored task. */
data class TaskDraft(
    val original: TaskEntity?,
    val name: String = original?.name.orEmpty(),
    val date: LocalDate = original?.date ?: LocalDate.now(),
    val time: LocalTime? = original?.time,
    val reminderMinutes: Int? = original?.reminderMinutesBefore,
    val project: String = original?.category?.takeIf { it.isNotBlank() } ?: "Home",
    val priority: Int = original?.priority ?: 0,
    val repeatType: RepeatType = original?.repeatType ?: RepeatType.NONE,
    val repeatEvery: Int = original?.repeatDuration?.takeIf { it > 0 && original?.repeatType != RepeatType.SPECIFIC_WEEKDAYS } ?: 1,
    val weekdayMask: Int = original?.repeatDuration?.takeIf { original?.repeatType == RepeatType.SPECIFIC_WEEKDAYS }
        ?: WeekdayMask.bit(LocalDate.now().dayOfWeek),
) {
    val isNew: Boolean get() = original == null
    val canSave: Boolean get() = name.isNotBlank() &&
        (repeatType != RepeatType.SPECIFIC_WEEKDAYS || weekdayMask != 0)

    fun toEntity(): TaskEntity {
        val base = original ?: TaskEntity(uuid = "", name = "", taskDate = null)
        val repeatDuration = when (repeatType) {
            RepeatType.NONE -> 0
            RepeatType.SPECIFIC_WEEKDAYS -> weekdayMask
            else -> repeatEvery.coerceAtLeast(1)
        }
        val newDate = TimeFormats.formatDate(date)
        return base.copy(
            name = name.trim(),
            taskDate = newDate,
            // Moving a task to another day drops its manual position there
            dayOrder = if (base.taskDate == newDate) base.dayOrder else null,
            assignedTime = time?.let(TimeFormats::formatTime),
            reminderMinutesBefore = if (time == null) null else reminderMinutes,
            category = project.trim().ifBlank { "Home" },
            priority = priority,
            repeatType = repeatType,
            repeatDuration = repeatDuration,
        )
    }
}
