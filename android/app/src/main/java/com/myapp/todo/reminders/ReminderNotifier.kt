package com.myapp.todo.reminders

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.myapp.todo.MainActivity
import com.myapp.todo.R
import com.myapp.todo.data.TaskEntity
import java.time.format.DateTimeFormatter

object ReminderNotifier {
    const val CHANNEL_REMINDERS = "reminders"
    private val TIME = DateTimeFormatter.ofPattern("HH:mm")

    fun createChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_REMINDERS,
            context.getString(R.string.channel_reminders),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply { description = context.getString(R.string.channel_reminders_desc) }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun canPost(context: Context): Boolean {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        return granted && NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    fun notificationId(uuid: String): Int = uuid.hashCode()

    fun show(context: Context, task: TaskEntity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val id = notificationId(task.uuid)
        val text = listOfNotNull(
            task.time?.format(TIME),
            task.category.takeIf { it.isNotBlank() }?.let { "# $it" },
        ).joinToString("  ·  ")

        val open = PendingIntent.getActivity(
            context, id,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val markDone = PendingIntent.getBroadcast(
            context, 0,
            Intent(context, ReminderReceiver::class.java)
                .setAction(ReminderReceiver.ACTION_MARK_DONE)
                .setData(Uri.parse("mytodo://done/${task.uuid}"))
                .putExtra(ReminderReceiver.EXTRA_UUID, task.uuid),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(context, R.color.launcher_bg))
            .setContentTitle(task.name)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(open)
            .addAction(0, context.getString(R.string.action_mark_done), markDone)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (_: SecurityException) {
            // Notification permission revoked concurrently
        }
    }

    fun cancel(context: Context, uuid: String) {
        NotificationManagerCompat.from(context).cancel(notificationId(uuid))
    }
}
