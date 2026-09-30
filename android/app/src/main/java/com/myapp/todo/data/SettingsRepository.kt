package com.myapp.todo.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.myapp.todo.sync.SyncCursorStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class SyncStatus(
    val lastSuccessAt: Long? = null,
    val lastAttemptAt: Long? = null,
    val lastError: String? = null,
)

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsRepository(context: Context) : SyncCursorStore {
    private val store = context.applicationContext.dataStore

    private object Keys {
        val serverUrl = stringPreferencesKey("server_url")
        val cursor = longPreferencesKey("sync_cursor")
        val lastSuccess = longPreferencesKey("last_sync_success")
        val lastAttempt = longPreferencesKey("last_sync_attempt")
        val lastError = stringPreferencesKey("last_sync_error")
        val theme = stringPreferencesKey("theme_mode")
        val firstRunDone = booleanPreferencesKey("first_run_done")
    }

    val serverUrl: Flow<String> = store.data.map { it[Keys.serverUrl].orEmpty() }
    val themeMode: Flow<ThemeMode> = store.data.map { prefs ->
        ThemeMode.entries.firstOrNull { it.name == prefs[Keys.theme] } ?: ThemeMode.SYSTEM
    }
    val firstRunDone: Flow<Boolean> = store.data.map { it[Keys.firstRunDone] ?: false }
    val syncStatus: Flow<SyncStatus> = store.data.map {
        SyncStatus(it[Keys.lastSuccess], it[Keys.lastAttempt], it[Keys.lastError])
    }

    suspend fun serverUrlNow(): String = serverUrl.first()

    /** Changing servers restarts the pull from scratch; dirty rows are still pushed. */
    suspend fun setServerUrl(url: String) {
        store.edit {
            val trimmed = url.trim()
            if (trimmed != it[Keys.serverUrl]) {
                it[Keys.serverUrl] = trimmed
                it[Keys.cursor] = 0L
                it.remove(Keys.lastError)
            }
            it[Keys.firstRunDone] = true
        }
    }

    suspend fun setFirstRunDone() = store.edit { it[Keys.firstRunDone] = true }

    suspend fun setThemeMode(mode: ThemeMode) = store.edit { it[Keys.theme] = mode.name }

    suspend fun recordSyncSuccess(at: Long) = store.edit {
        it[Keys.lastSuccess] = at
        it[Keys.lastAttempt] = at
        it.remove(Keys.lastError)
    }

    suspend fun recordSyncError(at: Long, message: String) = store.edit {
        it[Keys.lastAttempt] = at
        it[Keys.lastError] = message
    }

    override suspend fun cursor(): Long = store.data.first()[Keys.cursor] ?: 0L

    override suspend fun setCursor(value: Long) {
        store.edit { it[Keys.cursor] = value }
    }
}
