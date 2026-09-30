package com.myapp.todo.ui.settings

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myapp.todo.data.SyncStatus
import com.myapp.todo.data.ThemeMode
import com.myapp.todo.reminders.ReminderNotifier
import com.myapp.todo.ui.SettingsViewModel
import com.myapp.todo.ui.components.ScreenHeader
import com.myapp.todo.ui.theme.AppTheme
import java.text.DateFormat
import java.util.Date

@Composable
fun SettingsScreen(vm: SettingsViewModel, offline: Boolean) {
    val context = LocalContext.current
    val savedUrl by vm.serverUrl.collectAsStateWithLifecycle()
    val theme by vm.themeMode.collectAsStateWithLifecycle()
    val status by vm.syncStatus.collectAsStateWithLifecycle()
    val syncing by vm.isSyncing.collectAsStateWithLifecycle()

    // Permission state lives in the system; re-read it whenever we come back to the screen
    var permissionTick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        permissionTick++
        vm.refreshReminders()
    }
    val notificationsOk = remember(permissionTick) { ReminderNotifier.canPost(context) }
    val exactOk = remember(permissionTick) { vm.canScheduleExact() }
    // Android only shows the prompt a couple of times; after one try, send people to system settings
    var askedNotifications by rememberSaveable { mutableStateOf(false) }
    val requestNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        permissionTick++
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp),
    ) {
        ScreenHeader("Settings", offline = offline)

        SettingsCard("Server") {
            ServerUrlField(savedUrl.orEmpty(), onSave = vm::saveServerUrl)
            SyncStatusLine(savedUrl.orEmpty(), status, syncing)
            OutlinedButton(onClick = vm::syncNow, enabled = !savedUrl.isNullOrBlank() && !syncing, shape = MaterialTheme.shapes.small) {
                Text(if (syncing) "Syncing…" else "Sync now")
            }
        }

        SettingsCard("Appearance") {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                ThemeMode.entries.forEachIndexed { index, mode ->
                    SegmentedButton(
                        selected = theme == mode,
                        onClick = { vm.setTheme(mode) },
                        shape = SegmentedButtonDefaults.itemShape(index, ThemeMode.entries.size),
                    ) { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) }
                }
            }
        }

        SettingsCard("Reminders") {
            PermissionRow(
                title = "Notifications",
                ok = notificationsOk,
                okText = "Allowed",
                badText = "Blocked — reminders can't be shown",
                action = if (notificationsOk) null else "Allow",
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !askedNotifications) {
                    askedNotifications = true
                    requestNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    openNotificationSettings(context)
                }
            }
            PermissionRow(
                title = "Exact alarms",
                ok = exactOk,
                okText = "Allowed — reminders fire on time",
                badText = "Not allowed — reminders may be up to 10 min late",
                action = if (exactOk || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) null else "Open settings",
            ) { openExactAlarmSettings(context) }
        }
    }
}

@Composable
private fun SettingsCard(title: String, content: @Composable () -> Unit) {
    Text(
        title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 8.dp),
    )
    Surface(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, AppTheme.colors.border),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() }
    }
}

@Composable
fun ServerUrlField(saved: String, onSave: (String) -> Unit) {
    var text by rememberSaveable(saved) { mutableStateOf(saved) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Server URL") },
            placeholder = { Text("http://192.168.1.20:5555") },
            supportingText = { Text("LAN IP or Tailscale name. Emulator: http://10.0.2.2:5555. Empty = local only.") },
            singleLine = true,
            shape = MaterialTheme.shapes.small,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done),
            textStyle = MaterialTheme.typography.bodyMedium,
        )
        Button(onClick = { onSave(text) }, enabled = text.trim() != saved, shape = MaterialTheme.shapes.small) {
            Text("Save")
        }
    }
}

@Composable
private fun SyncStatusLine(url: String, status: SyncStatus, syncing: Boolean) {
    val colors = AppTheme.colors
    val style = MaterialTheme.typography.labelMedium
    when {
        url.isBlank() -> Text("Local only — tasks stay on this phone until a server is set.", style = style, color = colors.text3)
        syncing -> Text("Syncing…", style = style, color = colors.text3)
        status.lastError != null -> Column {
            Text(status.lastError, style = style, color = colors.danger)
            Text("Last success: ${formatTime(status.lastSuccessAt)}", style = style, color = colors.text3)
        }
        else -> Text("Last synced: ${formatTime(status.lastSuccessAt)}", style = style, color = colors.text3)
    }
}

@Composable
private fun PermissionRow(title: String, ok: Boolean, okText: String, badText: String, action: String?, onAction: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium)
            Text(
                if (ok) okText else badText,
                style = MaterialTheme.typography.labelMedium,
                color = if (ok) AppTheme.colors.success else AppTheme.colors.danger,
            )
        }
        if (action != null) {
            OutlinedButton(onClick = onAction, shape = MaterialTheme.shapes.small) { Text(action) }
        }
    }
}

private fun formatTime(millis: Long?): String =
    millis?.let { DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(it)) } ?: "never"

private fun openNotificationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    context.startActivity(intent)
}

private fun openExactAlarmSettings(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.startActivity(
            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")),
        )
    }
}
