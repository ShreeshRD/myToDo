package com.myapp.todo.data

import com.myapp.todo.data.remote.SyncPushRequestDto
import com.myapp.todo.data.remote.SyncResponseDto
import com.myapp.todo.data.remote.WireJson
import com.myapp.todo.data.remote.toDto
import com.myapp.todo.data.remote.toEntity
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WireJsonTest {
    // Shape produced by Spring/Jackson for TodoItem (see TodoItem.java)
    private val serverJson = """
        {"serverTime":1759140000000,"items":[
          {"taskDate":"2026-09-29","dayOrder":2,"id":41,"category":"Office","name":"Standup",
           "complete":false,"repeatType":"SPECIFIC_WEEKDAYS","repeatDuration":124,"priority":1,
           "inProgress":false,"longTerm":false,"uuid":"u-1","updatedAt":1759139999000,"deleted":false,
           "reminderMinutesBefore":10,"assignedTime":"09:30:00","timeTaken":null},
          {"taskDate":"2026-09-30","dayOrder":null,"id":42,"category":"Home","name":"Groceries",
           "complete":true,"repeatType":null,"repeatDuration":null,"priority":null,
           "inProgress":false,"longTerm":true,"uuid":"u-2","updatedAt":1759139999500,"deleted":true,
           "reminderMinutesBefore":null,"assignedTime":null,"timeTaken":3600,"someNewField":"x"}
        ]}
    """.trimIndent()

    @Test
    fun decodesBackendResponse() {
        val response = WireJson.json.decodeFromString<SyncResponseDto>(serverJson)
        assertEquals(1759140000000, response.serverTime)
        val (a, b) = response.items
        assertEquals("09:30:00", a.assignedTime)
        assertEquals(124, a.repeatDuration)
        assertNull(b.assignedTime)
        assertNull(b.priority)
        assertTrue(b.deleted)
        assertEquals(3600L, b.timeTaken)
    }

    @Test
    fun mapsToEntities() {
        val items = WireJson.json.decodeFromString<SyncResponseDto>(serverJson).items
        val a = items[0].toEntity()!!
        assertEquals(RepeatType.SPECIFIC_WEEKDAYS, a.repeatType)
        assertEquals(41L, a.serverId)
        assertEquals("2026-09-29", a.taskDate)
        assertEquals(1, a.priority)
        assertTrue(a.hasReminder)
        assertFalse(a.dirty)
        val b = items[1].toEntity()!!
        assertEquals(RepeatType.NONE, b.repeatType)
        assertEquals(0, b.priority)
        assertEquals(0, b.repeatDuration)
        assertNull(b.assignedTime)
        assertFalse(b.hasReminder)
    }

    @Test
    fun encodesPushWithExactFormatsAndExplicitNulls() {
        val task = TaskEntity(
            uuid = "u-3", name = "Call mum", category = "Personal", taskDate = "2026-10-01",
            assignedTime = "18:05", reminderMinutesBefore = 0, updatedAt = 123, dirty = true,
        )
        val untimed = task.copy(uuid = "u-4", assignedTime = null, reminderMinutesBefore = null)
        val body = WireJson.json.encodeToString(SyncPushRequestDto(listOf(task.toDto(), untimed.toDto())))
        val items = WireJson.json.parseToJsonElement(body).jsonObject["items"]!!.jsonArray
        val first = items[0].jsonObject
        assertEquals("18:05:00", first["assignedTime"]!!.jsonPrimitive.content)
        assertEquals("2026-10-01", first["taskDate"]!!.jsonPrimitive.content)
        assertEquals("NONE", first["repeatType"]!!.jsonPrimitive.content)
        assertEquals("false", first["complete"]!!.jsonPrimitive.content)
        assertEquals("false", first["deleted"]!!.jsonPrimitive.content)
        assertEquals(JsonNull, first["id"])
        assertFalse("dirty is local-only", first.containsKey("dirty"))
        val second = items[1].jsonObject
        assertEquals(JsonNull, second["assignedTime"])
        assertEquals(JsonNull, second["reminderMinutesBefore"])
    }

    @Test
    fun roundTripsEntity() {
        val task = TaskEntity(
            uuid = "u-5", serverId = 5, name = "Gym", category = "Personal", taskDate = "2026-10-02",
            dayOrder = 3, complete = true, priority = 2, repeatType = RepeatType.EVERY_X_WEEKS, repeatDuration = 2,
            assignedTime = "07:00:00", inProgress = true, longTerm = false, timeTaken = 90,
            reminderMinutesBefore = 1440, updatedAt = 999, deleted = false, dirty = false,
        )
        val json = WireJson.json.encodeToString(task.toDto())
        val back = WireJson.json.decodeFromString<com.myapp.todo.data.remote.TodoItemDto>(json).toEntity()
        assertEquals(task, back)
    }

    @Test
    fun timeFormatsNormalise() {
        assertEquals("09:05:00", TimeFormats.normalizeTime("09:05"))
        assertEquals("09:05:07", TimeFormats.normalizeTime("09:05:07"))
        assertEquals("09:05:07", TimeFormats.normalizeTime("09:05:07.123"))
        assertNull(TimeFormats.normalizeTime(null))
        assertNull(TimeFormats.normalizeTime(""))
        assertNull(TimeFormats.normalizeTime("nope"))
        assertNull(TimeFormats.parseDate("2026-13-01"))
    }
}
