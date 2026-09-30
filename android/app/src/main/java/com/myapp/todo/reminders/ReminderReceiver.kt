package com.myapp.todo.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.myapp.todo.TodoApp
import com.myapp.todo.util.goAsyncWork

/** Fires a reminder notification, or handles its "Mark done" action. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val uuid = intent.getStringExtra(EXTRA_UUID) ?: return
        val container = (context.applicationContext as TodoApp).container
        when (intent.action) {
            ACTION_FIRE -> goAsyncWork {
                val task = container.repository.find(uuid)
                // The task may have changed since the alarm was set; only remind if still relevant
                if (task != null && !task.complete && !task.deleted && task.hasReminder) {
                    ReminderNotifier.show(context, task)
                }
            }
            ACTION_MARK_DONE -> goAsyncWork {
                ReminderNotifier.cancel(context, uuid)
                container.repository.setComplete(uuid, true) // marks dirty, requests sync
            }
        }
    }

    companion object {
        const val ACTION_FIRE = "com.myapp.todo.REMINDER_FIRE"
        const val ACTION_MARK_DONE = "com.myapp.todo.REMINDER_MARK_DONE"
        const val EXTRA_UUID = "uuid"
    }
}
