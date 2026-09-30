package com.myapp.todo.data.remote

import com.myapp.todo.data.RepeatType
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.TimeFormats
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Wire shape of the backend's TodoItem (Jackson), see backend-springboot/.../TodoItem.java. */
@Serializable
data class TodoItemDto(
    val id: Long? = null,
    val uuid: String? = null,
    val name: String? = null,
    val category: String? = null,
    val taskDate: String? = null,
    val dayOrder: Int? = null,
    val complete: Boolean = false,
    val priority: Int? = null,
    val repeatType: String? = null,
    val repeatDuration: Int? = null,
    val assignedTime: String? = null,
    val inProgress: Boolean = false,
    val longTerm: Boolean = false,
    val timeTaken: Long? = null,
    val reminderMinutesBefore: Int? = null,
    val updatedAt: Long? = null,
    val deleted: Boolean = false,
)

@Serializable
data class SyncResponseDto(
    val serverTime: Long,
    val items: List<TodoItemDto> = emptyList(),
)

@Serializable
data class SyncPushRequestDto(
    val items: List<TodoItemDto>,
)

object WireJson {
    val json: Json = Json {
        ignoreUnknownKeys = true
        // Jackson may write null for a primitive-less field; fall back to the default
        coerceInputValues = true
        encodeDefaults = true
        explicitNulls = true
    }
}

fun TaskEntity.toDto(): TodoItemDto = TodoItemDto(
    id = serverId,
    uuid = uuid,
    name = name,
    category = category,
    taskDate = taskDate,
    dayOrder = dayOrder,
    complete = complete,
    priority = priority,
    repeatType = repeatType.name,
    repeatDuration = repeatDuration,
    assignedTime = TimeFormats.normalizeTime(assignedTime),
    inProgress = inProgress,
    longTerm = longTerm,
    timeTaken = timeTaken,
    reminderMinutesBefore = reminderMinutesBefore,
    updatedAt = updatedAt,
    deleted = deleted,
)

/** Maps a server item to a clean local row; null when it has no uuid (cannot be tracked). */
fun TodoItemDto.toEntity(): TaskEntity? {
    val key = uuid?.takeIf { it.isNotBlank() } ?: return null
    return TaskEntity(
        uuid = key,
        serverId = id,
        name = name.orEmpty(),
        category = category.orEmpty(),
        taskDate = TimeFormats.parseDate(taskDate)?.let(TimeFormats::formatDate),
        dayOrder = dayOrder,
        complete = complete,
        priority = (priority ?: 0).coerceIn(0, 4),
        repeatType = RepeatType.parse(repeatType),
        repeatDuration = repeatDuration ?: 0,
        assignedTime = TimeFormats.normalizeTime(assignedTime),
        inProgress = inProgress,
        longTerm = longTerm,
        timeTaken = timeTaken,
        reminderMinutesBefore = reminderMinutesBefore,
        updatedAt = updatedAt ?: 0,
        deleted = deleted,
        dirty = false,
    )
}
