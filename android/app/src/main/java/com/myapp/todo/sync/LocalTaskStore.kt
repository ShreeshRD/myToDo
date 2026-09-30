package com.myapp.todo.sync

import androidx.room.withTransaction
import com.myapp.todo.data.AppDatabase
import com.myapp.todo.data.TaskEntity

/** The slice of local storage the SyncEngine uses, so it can be tested with an in-memory fake. */
interface LocalTaskStore {
    suspend fun dirty(): List<TaskEntity>
    suspend fun find(uuid: String): TaskEntity?
    suspend fun upsert(task: TaskEntity)
    suspend fun delete(uuid: String)
    suspend fun transaction(block: suspend () -> Unit)
}

interface SyncCursorStore {
    suspend fun cursor(): Long
    suspend fun setCursor(value: Long)
}

class RoomTaskStore(private val db: AppDatabase) : LocalTaskStore {
    private val dao = db.taskDao()
    override suspend fun dirty() = dao.dirty()
    override suspend fun find(uuid: String) = dao.find(uuid)
    override suspend fun upsert(task: TaskEntity) = dao.upsert(task)
    override suspend fun delete(uuid: String) = dao.delete(uuid)
    override suspend fun transaction(block: suspend () -> Unit) = db.withTransaction { block() }
}
