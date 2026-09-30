package com.myapp.todo

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import com.myapp.todo.reminders.ReminderNotifier
import kotlinx.coroutines.launch

class TodoApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        ReminderNotifier.createChannel(this)
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL_SYNC, getString(R.string.channel_sync), NotificationManager.IMPORTANCE_MIN),
        )
        container.syncScheduler.schedulePeriodic()
        container.syncScheduler.requestSync()
        container.appScope.launch { container.rescheduleReminders() }
    }

    companion object {
        const val CHANNEL_SYNC = "sync"
    }
}
