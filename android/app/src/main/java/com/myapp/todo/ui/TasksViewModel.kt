package com.myapp.todo.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myapp.todo.AppContainer
import com.myapp.todo.data.TaskEntity
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

/** A reversible action surfaced as a snackbar with "Undo". */
data class UndoEvent(val message: String, val snapshot: TaskEntity)

class TasksViewModel(private val container: AppContainer) : ViewModel() {
    private val repository = container.repository

    // Re-evaluated every minute so "today" rolls over at midnight
    private val todayFlow = flow {
        while (true) {
            emit(LocalDate.now())
            delay(60_000)
        }
    }.distinctUntilChanged()

    private val tasks = repository.visibleTasks
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val today: StateFlow<LocalDate> = todayFlow.stateIn(viewModelScope, SharingStarted.Eagerly, LocalDate.now())

    val todayState: StateFlow<TodayState> = combine(tasks, todayFlow) { list, day -> TaskGrouping.today(list, day) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayState())

    val upcoming: StateFlow<List<DayGroup>> = combine(tasks, todayFlow) { list, day -> TaskGrouping.upcoming(list, day) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val query = MutableStateFlow("")
    val filter = MutableStateFlow(SearchFilter.ALL)
    val searchResults: StateFlow<List<TaskEntity>> = combine(tasks, query, filter) { list, q, f ->
        TaskGrouping.search(list, q, f)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val projects: StateFlow<List<String>> = repository.categories.map(TaskGrouping::projects)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TaskGrouping.DEFAULT_PROJECTS)

    val isSyncing: StateFlow<Boolean> = container.syncScheduler.isSyncing
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    /** Offline = no network, or a server is configured and the last sync failed. */
    val isOffline: StateFlow<Boolean> = combine(
        container.networkMonitor.isOnline,
        container.settings.syncStatus,
        container.settings.serverUrl,
    ) { online, status, url -> !online || (url.isNotBlank() && status.lastError != null) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    private val _undo = MutableSharedFlow<UndoEvent>(extraBufferCapacity = 4)
    val undoEvents: SharedFlow<UndoEvent> = _undo

    fun setComplete(task: TaskEntity, complete: Boolean) = viewModelScope.launch {
        repository.setComplete(task.uuid, complete)
        if (complete) _undo.tryEmit(UndoEvent("Completed “${task.name}”", task))
    }

    fun delete(task: TaskEntity) = viewModelScope.launch {
        val snapshot = repository.delete(task.uuid) ?: return@launch
        _undo.tryEmit(UndoEvent("Deleted “${task.name}”", snapshot))
    }

    fun undo(event: UndoEvent) = viewModelScope.launch { repository.restore(event.snapshot) }

    fun save(task: TaskEntity) = viewModelScope.launch { repository.save(task) }

    fun syncNow() = container.syncScheduler.requestSync()
}
