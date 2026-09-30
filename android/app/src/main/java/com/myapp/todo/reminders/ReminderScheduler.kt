package com.myapp.todo.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.myapp.todo.data.TaskEntity
import java.time.Instant
import java.time.ZoneId

/** Keeps exactly one AlarmManager alarm per task with a future reminder. */
class ReminderScheduler(context: Context) {
    private val context = context.applicationContext
    private val alarmManager = this.context.getSystemService(AlarmManager::class.java)
    private val prefs = this.context.getSharedPreferences("reminders", Context.MODE_PRIVATE)

    fun canScheduleExact(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()

    @Synchronized
    fun rescheduleAll(tasks: List<TaskEntity>, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()) {
        val due = ReminderCalculator.upcoming(tasks, now, zone)
        val keep = due.map { it.first }.toSet()
        val previous = prefs.getStringSet(KEY_SCHEDULED, emptySet()).orEmpty()
        for (uuid in previous - keep) {
            alarmManager.cancel(pendingIntent(uuid))
        }
        for ((uuid, at) in due) {
            schedule(uuid, at.toEpochMilli())
        }
        prefs.edit().putStringSet(KEY_SCHEDULED, keep).apply()
    }

    private fun schedule(uuid: String, atMillis: Long) {
        val pi = pendingIntent(uuid)
        if (canScheduleExact()) {
            try {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi)
                return
            } catch (_: SecurityException) {
                // Permission revoked between the check and the call; fall through to inexact
            }
        }
        alarmManager.setWindow(AlarmManager.RTC_WAKEUP, atMillis, INEXACT_WINDOW_MS, pi)
    }

    private fun pendingIntent(uuid: String): PendingIntent {
        // The data URI makes each task's intent distinct for PendingIntent matching
        val intent = Intent(context, ReminderReceiver::class.java)
            .setAction(ReminderReceiver.ACTION_FIRE)
            .setData(Uri.parse("mytodo://task/$uuid"))
            .putExtra(ReminderReceiver.EXTRA_UUID, uuid)
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private companion object {
        const val KEY_SCHEDULED = "scheduled_uuids"
        const val INEXACT_WINDOW_MS = 10 * 60 * 1000L
    }
}
