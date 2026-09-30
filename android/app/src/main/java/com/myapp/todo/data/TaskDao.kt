package com.myapp.todo.data

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks WHERE deleted = 0")
    fun observeVisible(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE deleted = 0")
    suspend fun visible(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE dirty = 1")
    suspend fun dirty(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE uuid = :uuid")
    suspend fun find(uuid: String): TaskEntity?

    @Upsert
    suspend fun upsert(task: TaskEntity)

    @Query("DELETE FROM tasks WHERE uuid = :uuid")
    suspend fun delete(uuid: String)

    @Query("SELECT DISTINCT category FROM tasks WHERE deleted = 0 AND category != '' ORDER BY category COLLATE NOCASE")
    fun observeCategories(): Flow<List<String>>
}
