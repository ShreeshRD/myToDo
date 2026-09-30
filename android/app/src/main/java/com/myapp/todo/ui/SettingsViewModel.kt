package com.myapp.todo.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myapp.todo.AppContainer
import com.myapp.todo.data.SyncStatus
import com.myapp.todo.data.ThemeMode
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(private val container: AppContainer) : ViewModel() {
    private val settings = container.settings

    val serverUrl: StateFlow<String?> = settings.serverUrl
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val themeMode: StateFlow<ThemeMode> = settings.themeMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)
    val syncStatus: StateFlow<SyncStatus> = settings.syncStatus
        .stateIn(viewModelScope, SharingStarted.Eagerly, SyncStatus())
    val firstRunDone: StateFlow<Boolean?> = settings.firstRunDone
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val isSyncing: StateFlow<Boolean> = container.syncScheduler.isSyncing
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun saveServerUrl(url: String) = viewModelScope.launch {
        settings.setServerUrl(url)
        container.syncScheduler.requestSync()
    }

    fun skipServerSetup() = viewModelScope.launch { settings.setFirstRunDone() }

    fun setTheme(mode: ThemeMode) = viewModelScope.launch { settings.setThemeMode(mode) }

    fun syncNow() = container.syncScheduler.requestSync()

    fun canScheduleExact(): Boolean = container.reminderScheduler.canScheduleExact()

    /** After the user changes a permission in system settings. */
    fun refreshReminders() = viewModelScope.launch { container.rescheduleReminders() }
}
