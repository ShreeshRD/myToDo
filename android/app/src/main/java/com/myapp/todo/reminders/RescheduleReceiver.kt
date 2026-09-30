package com.myapp.todo.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.myapp.todo.TodoApp
import com.myapp.todo.util.goAsyncWork

/** Alarms are lost on reboot and are wall-clock based, so rebuild them on these events. */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
            -> {
                val container = (context.applicationContext as TodoApp).container
                goAsyncWork { container.rescheduleReminders() }
            }
        }
    }
}
