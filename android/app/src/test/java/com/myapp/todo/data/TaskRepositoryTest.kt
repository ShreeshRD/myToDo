package com.myapp.todo.data

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TaskRepositoryTest {
    private class FakeDao : TaskDao {
        val rows = linkedMapOf<String, TaskEntity>()
        override fun observeVisible(): Flow<List<TaskEntity>> = flowOf(rows.values.filter { !it.deleted })
        override suspend fun visible() = rows.values.filter { !it.deleted }
        override suspend fun dirty() = rows.values.filter { it.dirty }
        override suspend fun find(uuid: String) = rows[uuid]
        override suspend fun upsert(task: TaskEntity) { rows[task.uuid] = task }
        override suspend fun delete(uuid: String) { rows.remove(uuid) }
        override fun observeCategories(): Flow<List<String>> = flowOf(emptyList())
    }

    @Test
    fun editsStampMarkDirtyAndNotify() = runTest {
        val dao = FakeDao()
        var now = 1_000L
        var changes = 0
        val scope = TestScope(StandardTestDispatcher(testScheduler))
        val repo = TaskRepository(dao, scope, clock = { now }, onLocalChange = { changes++ })

        val saved = repo.save(TaskEntity(uuid = "", name = "New", taskDate = "2026-09-29"))
        assertTrue(saved.uuid.isNotBlank())
        assertTrue(saved.dirty)
        assertEquals(1_000L, saved.updatedAt)

        // Same millisecond: stamp still moves forward
        repo.setComplete(saved.uuid, true)
        assertEquals(1_001L, dao.rows[saved.uuid]!!.updatedAt)
        assertTrue(dao.rows[saved.uuid]!!.complete)

        now = 5_000
        val snapshot = repo.delete(saved.uuid)!!
        val tomb = dao.rows[saved.uuid]!!
        assertTrue(tomb.deleted && tomb.dirty)
        assertEquals(5_000L, tomb.updatedAt)

        // Undo after the tombstone was synced and removed locally
        dao.rows.remove(saved.uuid)
        now = 6_000
        repo.restore(snapshot)
        val restored = dao.rows[saved.uuid]!!
        assertFalse(restored.deleted)
        assertTrue(restored.dirty)
        assertTrue(restored.updatedAt > tomb.updatedAt)

        scope.advanceUntilIdle()
        assertEquals(4, changes)
    }

    @Test
    fun clearingTimeDropsReminder() = runTest {
        val dao = FakeDao()
        val repo = TaskRepository(dao, TestScope(StandardTestDispatcher(testScheduler)))
        val saved = repo.save(TaskEntity(uuid = "a", name = "x", taskDate = "2026-09-29", assignedTime = null, reminderMinutesBefore = 15))
        assertEquals(null, saved.reminderMinutesBefore)
    }
}
