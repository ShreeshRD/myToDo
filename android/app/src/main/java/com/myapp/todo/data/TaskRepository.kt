package com.myapp.todo.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * All local edits go through here: each one stamps updatedAt, marks the row dirty and
 * then notifies [onLocalChange] (which reschedules reminders and requests a sync).
 */
class TaskRepository(
    private val dao: TaskDao,
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
    private val onLocalChange: suspend () -> Unit = {},
) {
    val visibleTasks: Flow<List<TaskEntity>> = dao.observeVisible()
    val categories: Flow<List<String>> = dao.observeCategories()

    suspend fun visibleNow(): List<TaskEntity> = dao.visible()

    suspend fun find(uuid: String): TaskEntity? = dao.find(uuid)

    /** Inserts a new task (uuid generated here) or updates an existing one. */
    suspend fun save(task: TaskEntity): TaskEntity {
        val existing = dao.find(task.uuid)
        val stored = task.copy(
            uuid = task.uuid.ifBlank { newUuid() },
            serverId = existing?.serverId ?: task.serverId,
            reminderMinutesBefore = if (task.assignedTime == null) null else task.reminderMinutesBefore,
            updatedAt = nextStamp(existing),
            dirty = true,
        )
        dao.upsert(stored)
        changed()
        return stored
    }

    suspend fun setComplete(uuid: String, complete: Boolean) {
        val existing = dao.find(uuid) ?: return
        if (existing.complete == complete || existing.deleted) return
        dao.upsert(existing.copy(complete = complete, updatedAt = nextStamp(existing), dirty = true))
        changed()
    }

    /** Soft delete; returns the pre-delete snapshot for undo. */
    suspend fun delete(uuid: String): TaskEntity? {
        val existing = dao.find(uuid) ?: return null
        dao.upsert(existing.copy(deleted = true, updatedAt = nextStamp(existing), dirty = true))
        changed()
        return existing
    }

    /** Puts a snapshot back (undo). Works even if the tombstone was already synced and removed. */
    suspend fun restore(snapshot: TaskEntity) {
        val existing = dao.find(snapshot.uuid)
        dao.upsert(
            snapshot.copy(
                serverId = existing?.serverId ?: snapshot.serverId,
                deleted = false,
                updatedAt = nextStamp(existing ?: snapshot),
                dirty = true,
            ),
        )
        changed()
    }

    // Strictly increasing so a change is never mistaken for the version already pushed
    private fun nextStamp(existing: TaskEntity?): Long =
        maxOf(clock(), (existing?.updatedAt ?: 0L) + 1)

    private fun changed() {
        scope.launch { onLocalChange() }
    }

    companion object {
        fun newUuid(): String = UUID.randomUUID().toString()
    }
}
