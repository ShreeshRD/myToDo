package com.myapp.todo.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Today
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.myapp.todo.AppContainer
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.reminders.ReminderNotifier
import com.myapp.todo.ui.editor.TaskEditorSheet
import com.myapp.todo.ui.search.SearchScreen
import com.myapp.todo.ui.settings.ServerUrlField
import com.myapp.todo.ui.settings.SettingsScreen
import com.myapp.todo.ui.today.TodayScreen
import com.myapp.todo.ui.upcoming.UpcomingScreen

private enum class Tab(val label: String, val icon: ImageVector) {
    TODAY("Today", Icons.Outlined.Today),
    UPCOMING("Upcoming", Icons.Outlined.CalendarMonth),
    SEARCH("Search", Icons.Outlined.Search),
    SETTINGS("Settings", Icons.Outlined.Settings),
}

/** Editor target: a task to edit, or a new one. */
private sealed interface EditorTarget {
    data object New : EditorTarget
    data class Existing(val task: TaskEntity) : EditorTarget
}

@Composable
fun MainScreen(container: AppContainer) {
    val tasksVm: TasksViewModel = viewModel(factory = viewModelFactory { initializer { TasksViewModel(container) } })
    val settingsVm: SettingsViewModel = viewModel(factory = viewModelFactory { initializer { SettingsViewModel(container) } })

    var tab by rememberSaveable { mutableStateOf(Tab.TODAY) }
    var editor by remember { mutableStateOf<EditorTarget?>(null) }
    val snackbar = remember { SnackbarHostState() }

    val today by tasksVm.today.collectAsStateWithLifecycle()
    val syncing by tasksVm.isSyncing.collectAsStateWithLifecycle()
    val offline by tasksVm.isOffline.collectAsStateWithLifecycle()
    val projects by tasksVm.projects.collectAsStateWithLifecycle()

    NotificationPermissionOnFirstLaunch()
    FirstRunServerPrompt(settingsVm)

    LaunchedEffect(Unit) {
        tasksVm.undoEvents.collect { event ->
            snackbar.currentSnackbarData?.dismiss()
            val result = snackbar.showSnackbar(event.message, actionLabel = "Undo", duration = SnackbarDuration.Short)
            if (result == SnackbarResult.ActionPerformed) tasksVm.undo(event)
        }
    }

    val actions = remember(tasksVm) {
        TaskActions(
            onToggle = { task, done -> tasksVm.setComplete(task, done) },
            onDelete = { task -> tasksVm.delete(task) },
            onEdit = { task -> editor = EditorTarget.Existing(task) },
            onRefresh = tasksVm::syncNow,
        )
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            if (tab != Tab.SETTINGS) {
                ExtendedFloatingActionButton(
                    onClick = { editor = EditorTarget.New },
                    icon = { Icon(Icons.Outlined.Add, contentDescription = null) },
                    text = { Text("Add task") },
                    shape = RoundedCornerShape(percent = 50),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            }
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = { Icon(t.icon, contentDescription = null) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                Tab.TODAY -> {
                    val state by tasksVm.todayState.collectAsStateWithLifecycle()
                    TodayScreen(state, today, syncing, offline, actions)
                }
                Tab.UPCOMING -> {
                    val groups by tasksVm.upcoming.collectAsStateWithLifecycle()
                    UpcomingScreen(groups, today, syncing, offline, actions)
                }
                Tab.SEARCH -> {
                    val query by tasksVm.query.collectAsStateWithLifecycle()
                    val filter by tasksVm.filter.collectAsStateWithLifecycle()
                    val results by tasksVm.searchResults.collectAsStateWithLifecycle()
                    SearchScreen(
                        query = query,
                        onQueryChange = { tasksVm.query.value = it },
                        filter = filter,
                        onFilterChange = { tasksVm.filter.value = it },
                        results = results,
                        today = today,
                        actions = actions,
                    )
                }
                Tab.SETTINGS -> SettingsScreen(settingsVm, offline)
            }
        }
    }

    editor?.let { target ->
        val task = (target as? EditorTarget.Existing)?.task
        TaskEditorSheet(
            task = task,
            projects = projects,
            today = today,
            onDismiss = { editor = null },
            onSave = {
                tasksVm.save(it)
                editor = null
            },
            onDelete = {
                tasksVm.delete(it)
                editor = null
            },
        )
    }
}

@Composable
private fun NotificationPermissionOnFirstLaunch() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    var asked by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        if (!asked && !ReminderNotifier.canPost(context)) {
            asked = true
            launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}

@Composable
private fun FirstRunServerPrompt(vm: SettingsViewModel) {
    val done by vm.firstRunDone.collectAsStateWithLifecycle()
    val url by vm.serverUrl.collectAsStateWithLifecycle()
    if (done != false || url?.isBlank() != true) return
    AlertDialog(
        onDismissRequest = vm::skipServerSetup,
        title = { Text("Connect to your server?") },
        text = { ServerUrlField(saved = "", onSave = vm::saveServerUrl) },
        confirmButton = {},
        dismissButton = { TextButton(onClick = vm::skipServerSetup) { Text("Use offline only") } },
        shape = MaterialTheme.shapes.large,
    )
}
