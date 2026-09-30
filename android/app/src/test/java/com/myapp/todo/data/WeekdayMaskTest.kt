package com.myapp.todo.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.SATURDAY
import java.time.DayOfWeek.SUNDAY
import java.time.DayOfWeek.THURSDAY
import java.time.DayOfWeek.TUESDAY
import java.time.DayOfWeek.WEDNESDAY
import java.util.Locale

class WeekdayMaskTest {
    @Test
    fun bitsMatchBackendEncoding() {
        // Bit 64 = Monday … bit 1 = Sunday (RecurrenceCalculator.java)
        assertEquals(64, WeekdayMask.bit(MONDAY))
        assertEquals(32, WeekdayMask.bit(TUESDAY))
        assertEquals(16, WeekdayMask.bit(WEDNESDAY))
        assertEquals(8, WeekdayMask.bit(THURSDAY))
        assertEquals(4, WeekdayMask.bit(FRIDAY))
        assertEquals(2, WeekdayMask.bit(SATURDAY))
        assertEquals(1, WeekdayMask.bit(SUNDAY))
    }

    @Test
    fun ofAndDaysRoundTrip() {
        val mask = WeekdayMask.of(listOf(MONDAY, WEDNESDAY, FRIDAY))
        assertEquals(64 + 16 + 4, mask)
        assertEquals(listOf(MONDAY, WEDNESDAY, FRIDAY), WeekdayMask.days(mask))
        assertEquals(124, WeekdayMask.of(listOf(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY)))
    }

    @Test
    fun toggleAndContains() {
        var mask = 0
        mask = WeekdayMask.toggle(mask, SUNDAY)
        assertTrue(WeekdayMask.contains(mask, SUNDAY))
        assertFalse(WeekdayMask.contains(mask, SATURDAY))
        mask = WeekdayMask.toggle(mask, SUNDAY)
        assertEquals(0, mask)
        // Stray high bits are ignored
        assertEquals(WeekdayMask.ALL, WeekdayMask.toggle(0xFFF, MONDAY) or 64)
    }

    @Test
    fun labels() {
        assertEquals("Weekdays", WeekdayMask.label(124, Locale.UK))
        assertEquals("Weekends", WeekdayMask.label(3, Locale.UK))
        assertEquals("Every day", WeekdayMask.label(127, Locale.UK))
        assertEquals("Mon, Fri", WeekdayMask.label(64 + 4, Locale.UK))
        assertEquals("No days", WeekdayMask.label(0, Locale.UK))
    }
}
