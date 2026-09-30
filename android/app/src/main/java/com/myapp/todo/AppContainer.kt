package com.myapp.todo

import android.content.Context
import com.myapp.todo.data.AppDatabase
import com.myapp.todo.data.SettingsRepository
import com.myapp.todo.data.TaskRepository
import com.myapp.todo.data.remote.RetrofitSyncRemote
import com.myapp.todo.data.remote.SyncRemote
import com.myapp.todo.reminders.ReminderScheduler
import com.myapp.todo.sync.NetworkMonitor
import com.myapp.todo.sync.RoomTaskStore
import com.myapp.todo.sync.SyncEngine
import com.myapp.todo.sync.SyncScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Manual DI: one instance per process, owned by [TodoApp]. */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val database: AppDatabase = AppDatabase.build(appContext)
    val settings = SettingsRepository(appContext)
    val syncScheduler = SyncScheduler(appContext)
    val reminderScheduler = ReminderScheduler(appContext)
    val networkMonitor = NetworkMonitor(appContext)

    val repository = TaskRepository(
        dao = database.taskDao(),
        scope = appScope,
        onLocalChange = {
            rescheduleReminders()
            syncScheduler.requestSync()
        },
    )

    val syncEngine = SyncEngine(RoomTaskStore(database), settings)

    fun remoteFor(baseUrl: String): SyncRemote = RetrofitSyncRemote(baseUrl)

    suspend fun rescheduleReminders() {
        reminderScheduler.rescheduleAll(repository.visibleNow())
    }
}
