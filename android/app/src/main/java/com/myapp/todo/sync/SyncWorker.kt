package com.myapp.todo.sync

import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.myapp.todo.AppContainer
import com.myapp.todo.R
import com.myapp.todo.TodoApp
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import java.io.IOException

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val container = (applicationContext as TodoApp).container
        val url = container.settings.serverUrlNow()
        if (url.isBlank()) return Result.success() // local-only mode

        val now = System.currentTimeMillis()
        return try {
            container.syncEngine.sync(container.remoteFor(url))
            container.settings.recordSyncSuccess(System.currentTimeMillis())
            container.rescheduleReminders()
            Result.success()
        } catch (e: IOException) {
            fail(container, now, "Can't reach server: ${e.message ?: e.javaClass.simpleName}")
        } catch (e: HttpException) {
            fail(container, now, "Server error ${e.code()}")
        } catch (e: SerializationException) {
            container.settings.recordSyncError(now, "Unexpected response from server")
            Result.failure()
        } catch (e: IllegalArgumentException) {
            container.settings.recordSyncError(now, "Invalid server URL")
            Result.failure()
        } catch (e: CancellationException) {
            throw e
        } catch (e: RuntimeException) {
            container.settings.recordSyncError(now, "Sync failed: ${e.message ?: e.javaClass.simpleName}")
            Result.failure()
        }
    }

    private suspend fun fail(container: AppContainer, now: Long, message: String): Result {
        container.settings.recordSyncError(now, message)
        return if (runAttemptCount < MAX_RETRIES) Result.retry() else Result.failure()
    }

    // Expedited work runs as a foreground service before Android 12
    override suspend fun getForegroundInfo(): ForegroundInfo {
        val notification = NotificationCompat.Builder(applicationContext, TodoApp.CHANNEL_SYNC)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(applicationContext.getString(R.string.sync_in_progress))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(FOREGROUND_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(FOREGROUND_ID, notification)
        }
    }

    private companion object {
        const val MAX_RETRIES = 3
        const val FOREGROUND_ID = 4201
    }
}

