package com.myapp.todo.sync

import com.myapp.todo.data.TaskEntity

class FakeTaskStore : LocalTaskStore, SyncCursorStore {
    val rows = linkedMapOf<String, TaskEntity>()
    var cursorValue = 0L

    override suspend fun dirty() = rows.values.filter { it.dirty }
    override suspend fun find(uuid: String) = rows[uuid]
    override suspend fun upsert(task: TaskEntity) { rows[task.uuid] = task }
    override suspend fun delete(uuid: String) { rows.remove(uuid) }
    override suspend fun transaction(block: suspend () -> Unit) = block()
    override suspend fun cursor() = cursorValue
    override suspend fun setCursor(value: Long) { cursorValue = value }
}
