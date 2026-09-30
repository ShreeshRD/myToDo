package com.myapp.todo.sync

import com.myapp.todo.data.RepeatType
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.remote.RetrofitSyncRemote
import com.myapp.todo.data.remote.SyncResponseDto
import com.myapp.todo.data.remote.TodoItemDto
import com.myapp.todo.data.remote.WireJson
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException

class SyncEngineTest {
    private lateinit var server: MockWebServer
    private lateinit var store: FakeTaskStore
    private lateinit var engine: SyncEngine
    private lateinit var remote: RetrofitSyncRemote

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        store = FakeTaskStore()
        engine = SyncEngine(store, store)
        remote = RetrofitSyncRemote(server.url("/").toString(), OkHttpClient())
    }

    @After
    fun tearDown() = server.shutdown()

    private fun local(uuid: String, updatedAt: Long, dirty: Boolean, name: String = uuid, deleted: Boolean = false) =
        TaskEntity(uuid = uuid, name = name, taskDate = "2026-09-29", updatedAt = updatedAt, dirty = dirty, deleted = deleted)

    private fun dto(uuid: String, updatedAt: Long, name: String = uuid, id: Long? = 1, deleted: Boolean = false, complete: Boolean = false) =
        TodoItemDto(id = id, uuid = uuid, name = name, category = "Home", taskDate = "2026-09-29", updatedAt = updatedAt,
            deleted = deleted, complete = complete, priority = 0, repeatType = "NONE", repeatDuration = 0)

    private fun respond(serverTime: Long, vararg items: TodoItemDto) = MockResponse()
        .setHeader("Content-Type", "application/json")
        .setBody(WireJson.json.encodeToString(SyncResponseDto(serverTime, items.toList())))

    @Test
    fun pushesDirtyRowsThenPullsAndStoresCursor() = runBlocking {
        store.upsert(local("a", 100, dirty = true).copy(assignedTime = "09:30:00", reminderMinutesBefore = 15))
        store.upsert(local("clean", 50, dirty = false))
        server.enqueue(respond(1_000, dto("a", 100, id = 7)))
        server.enqueue(respond(1_001, dto("b", 900, name = "from web", id = 8)))

        val result = engine.sync(remote)

        val push = server.takeRequest()
        assertEquals("POST", push.method)
        assertEquals("/todo/sync/push", push.path)
        val items = Json.parseToJsonElement(push.body.readUtf8()).jsonObject["items"]!!.jsonArray
        assertEquals(1, items.size)
        val sent = items[0].jsonObject
        assertEquals("a", sent["uuid"]!!.jsonPrimitive.content)
        assertEquals("09:30:00", sent["assignedTime"]!!.jsonPrimitive.content)
        assertEquals("15", sent["reminderMinutesBefore"]!!.jsonPrimitive.content)
        assertEquals("100", sent["updatedAt"]!!.jsonPrimitive.content)

        val pull = server.takeRequest()
        assertEquals("/todo/sync/changes?since=0", pull.path)

        assertFalse(store.rows["a"]!!.dirty)
        assertEquals(7L, store.rows["a"]!!.serverId)
        assertEquals("from web", store.rows["b"]!!.name)
        assertEquals(1_001L, store.cursorValue)
        assertEquals(SyncResult(pushed = 1, pulled = 1, serverTime = 1_001), result)
    }

    @Test
    fun nothingDirtySkipsPushAndUsesStoredCursor() = runBlocking {
        store.cursorValue = 555
        server.enqueue(respond(600))
        engine.sync(remote)
        assertEquals(1, server.requestCount)
        assertEquals("/todo/sync/changes?since=555", server.takeRequest().path)
        assertEquals(600L, store.cursorValue)
    }

    @Test
    fun pulledOlderVersionDoesNotOverwriteNewerDirtyRow() = runBlocking {
        store.upsert(local("a", 100, dirty = false, name = "v1"))
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                // The user edits the task while the pull is in flight
                runBlocking { store.upsert(local("a", 800, dirty = true, name = "edited")) }
                return respond(1_000, dto("a", 600, name = "older server edit"))
            }
        }
        engine.sync(remote)
        assertEquals("edited", store.rows["a"]!!.name)
        assertTrue(store.rows["a"]!!.dirty)
        assertEquals(1_000L, store.cursorValue)
    }

    @Test
    fun pulledNewerVersionBeatsOlderDirtyRow() = runBlocking {
        store.upsert(local("a", 100, dirty = false, name = "v1"))
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                runBlocking { store.upsert(local("a", 900, dirty = true, name = "mine")) }
                return respond(1_000, dto("a", 950, name = "server newer"))
            }
        }
        engine.sync(remote)
        // Last write wins: the server copy is newer, so the local edit is dropped
        assertEquals("server newer", store.rows["a"]!!.name)
        assertFalse(store.rows["a"]!!.dirty)
    }

    @Test
    fun rowEditedDuringPushStaysDirty() = runBlocking {
        store.upsert(local("a", 100, dirty = true, name = "v1"))
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path!!.startsWith("/todo/sync/push")) {
                    // The user edits the task while the push is in flight
                    runBlocking { store.upsert(local("a", 200, dirty = true, name = "v2")) }
                    respond(1_000, dto("a", 100, name = "v1", id = 3))
                } else {
                    respond(1_001, dto("a", 100, name = "v1", id = 3))
                }
        }
        engine.sync(remote)
        val row = store.rows["a"]!!
        assertEquals("v2", row.name)
        assertTrue(row.dirty)
        assertEquals(3L, row.serverId) // server id still learned
    }

    @Test
    fun serverNewerVersionReturnedFromPushWins() = runBlocking {
        store.upsert(local("a", 100, dirty = true, name = "stale"))
        server.enqueue(respond(1_000, dto("a", 400, name = "server")))
        server.enqueue(respond(1_001))
        engine.sync(remote)
        assertEquals("server", store.rows["a"]!!.name)
        assertFalse(store.rows["a"]!!.dirty)
    }

    @Test
    fun incomingTombstoneDeletesCleanRow() = runBlocking {
        store.upsert(local("a", 100, dirty = false))
        server.enqueue(respond(1_000, dto("a", 300, deleted = true)))
        engine.sync(remote)
        assertNull(store.rows["a"])
    }

    @Test
    fun localTombstoneIsPushedThenRemoved() = runBlocking {
        store.upsert(local("a", 300, dirty = true, deleted = true))
        server.enqueue(respond(1_000, dto("a", 300, deleted = true)))
        server.enqueue(respond(1_001, dto("a", 300, deleted = true)))
        engine.sync(remote)
        val sent = Json.parseToJsonElement(server.takeRequest().body.readUtf8())
            .jsonObject["items"]!!.jsonArray[0] as JsonObject
        assertEquals("true", sent["deleted"]!!.jsonPrimitive.content)
        assertNull(store.rows["a"])
    }

    @Test
    fun tombstoneOlderThanLocalDirtyEditIsIgnored() = runBlocking {
        store.upsert(local("a", 500, dirty = true, name = "revived"))
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path!!.startsWith("/todo/sync/push")) {
                    runBlocking { store.upsert(local("a", 700, dirty = true, name = "revived")) }
                    respond(1_000, dto("a", 600, deleted = true))
                } else {
                    respond(1_001, dto("a", 600, deleted = true))
                }
        }
        engine.sync(remote)
        assertEquals("revived", store.rows["a"]!!.name)
        assertTrue(store.rows["a"]!!.dirty)
    }

    @Test
    fun nextOccurrenceFromPushIsInsertedClean() = runBlocking {
        store.upsert(local("a", 100, dirty = true).copy(complete = true, repeatType = RepeatType.EVERY_X_DAYS, repeatDuration = 1))
        val next = dto("next", 1_000, id = 9).copy(taskDate = "2026-09-30", repeatType = "EVERY_X_DAYS", repeatDuration = 1)
        server.enqueue(respond(1_000, dto("a", 100, complete = true), next))
        server.enqueue(respond(1_001))
        engine.sync(remote)
        val row = store.rows["next"]!!
        assertEquals("2026-09-30", row.taskDate)
        assertEquals(RepeatType.EVERY_X_DAYS, row.repeatType)
        assertFalse(row.dirty)
        assertEquals(2, store.rows.size)
    }

    @Test
    fun rerunningTheSameRoundIsIdempotent() = runBlocking {
        store.upsert(local("a", 100, dirty = true))
        val dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path!!.startsWith("/todo/sync/push")) {
                    respond(1_000, dto("a", 100, id = 1))
                } else {
                    respond(1_001, dto("a", 100, id = 1), dto("b", 50, id = 2), dto("gone", 60, deleted = true))
                }
        }
        server.dispatcher = dispatcher
        engine.sync(remote)
        val first = store.rows.toMap()
        engine.sync(remote)
        engine.sync(remote)
        assertEquals(first, store.rows.toMap())
        assertEquals(setOf("a", "b"), store.rows.keys)
        // Only the first round had anything to push
        val paths = (1..server.requestCount).map { server.takeRequest().path }
        assertEquals(1, paths.count { it!!.startsWith("/todo/sync/push") })
    }

    @Test
    fun itemsWithoutUuidAreSkipped() = runBlocking {
        server.enqueue(respond(1_000, dto("x", 1).copy(uuid = null)))
        engine.sync(remote)
        assertTrue(store.rows.isEmpty())
    }

    @Test
    fun httpErrorKeepsDirtyRowsAndCursor() = runBlocking {
        store.cursorValue = 42
        store.upsert(local("a", 100, dirty = true))
        server.enqueue(MockResponse().setResponseCode(500))
        try {
            engine.sync(remote)
            fail("expected HttpException")
        } catch (e: HttpException) {
            assertEquals(500, e.code())
        }
        assertTrue(store.rows["a"]!!.dirty)
        assertEquals(42L, store.cursorValue)
    }

    @Test
    fun failedPullAfterPushDoesNotAdvanceCursor() = runBlocking {
        store.cursorValue = 42
        store.upsert(local("a", 100, dirty = true))
        server.enqueue(respond(1_000, dto("a", 100)))
        server.enqueue(MockResponse().setResponseCode(503))
        runCatching { engine.sync(remote) }
        assertFalse(store.rows["a"]!!.dirty) // push acknowledged
        assertEquals(42L, store.cursorValue)
    }

    @Test
    fun baseUrlIsNormalised() {
        assertEquals("http://192.168.1.20:5555/", RetrofitSyncRemote.normalizeBaseUrl(" 192.168.1.20:5555 "))
        assertEquals("https://box.tail.ts.net/", RetrofitSyncRemote.normalizeBaseUrl("https://box.tail.ts.net"))
        assertEquals("http://10.0.2.2:5555/api/", RetrofitSyncRemote.normalizeBaseUrl("http://10.0.2.2:5555/api/"))
    }
}
