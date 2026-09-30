package com.myapp.todo.sync

import com.myapp.todo.data.remote.SyncRemote
import com.myapp.todo.data.remote.TodoItemDto
import com.myapp.todo.data.remote.toDto
import com.myapp.todo.data.remote.toEntity
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class SyncResult(val pushed: Int, val pulled: Int, val serverTime: Long)

/**
 * One sync round: push dirty rows, pull changes since the cursor, store the new cursor.
 *
 * Every incoming item (push acknowledgement or pulled change) goes through the same
 * last-write-wins rule, so re-running a round is harmless:
 * a local row that is dirty and newer than the incoming copy is kept (it is pushed next
 * round); otherwise the server copy replaces it and the dirty flag clears. Tombstones
 * delete the local row. Next occurrences of recurring tasks arrive this way too — the
 * phone never creates them.
 */
class SyncEngine(
    private val store: LocalTaskStore,
    private val cursorStore: SyncCursorStore,
) {
    // The periodic and one-off workers may overlap; rounds run one at a time
    private val mutex = Mutex()

    suspend fun sync(remote: SyncRemote): SyncResult = mutex.withLock { syncLocked(remote) }

    private suspend fun syncLocked(remote: SyncRemote): SyncResult {
        val dirty = store.dirty()
        if (dirty.isNotEmpty()) {
            val response = remote.push(dirty.map { it.toDto() })
            applyAll(response.items)
        }

        val changes = remote.changes(cursorStore.cursor())
        applyAll(changes.items)
        cursorStore.setCursor(changes.serverTime)
        return SyncResult(pushed = dirty.size, pulled = changes.items.size, serverTime = changes.serverTime)
    }

    private suspend fun applyAll(items: List<TodoItemDto>) {
        if (items.isEmpty()) return
        store.transaction {
            for (item in items) apply(item)
        }
    }

    private suspend fun apply(item: TodoItemDto) {
        val incoming = item.toEntity() ?: return
        val local = store.find(incoming.uuid)
        if (local != null && local.dirty && local.updatedAt > incoming.updatedAt) {
            // Edited again locally after this version; keep ours but remember the server id
            if (local.serverId == null && incoming.serverId != null) {
                store.upsert(local.copy(serverId = incoming.serverId))
            }
            return
        }
        if (incoming.deleted) {
            store.delete(incoming.uuid)
        } else {
            store.upsert(incoming)
        }
    }
}
