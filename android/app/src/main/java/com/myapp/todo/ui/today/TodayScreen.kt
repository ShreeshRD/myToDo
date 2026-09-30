package com.myapp.todo.ui.today

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.ui.TaskActions
import com.myapp.todo.ui.TodayState
import com.myapp.todo.ui.components.DateLabels
import com.myapp.todo.ui.components.EmptyState
import com.myapp.todo.ui.components.ScreenHeader
import com.myapp.todo.ui.components.SectionHeader
import com.myapp.todo.ui.components.SwipeableTaskRow
import com.myapp.todo.ui.theme.AppTheme
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    state: TodayState,
    today: LocalDate,
    syncing: Boolean,
    offline: Boolean,
    actions: TaskActions,
) {
    var showCompleted by rememberSaveable { mutableStateOf(false) }
    PullToRefreshBox(isRefreshing = syncing, onRefresh = actions.onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            item(key = "header") {
                ScreenHeader("Today", DateLabels.header(today, today).substringBefore(" ·"), offline)
            }
            if (state.overdue.isNotEmpty()) {
                item(key = "overdue-h") { SectionHeader("Overdue", color = AppTheme.colors.danger) }
                taskItems("o", state.overdue, today, showDate = true, actions)
            }
            if (state.overdue.isNotEmpty() && state.today.isNotEmpty()) {
                item(key = "today-h") { SectionHeader("Today") }
            }
            taskItems("t", state.today, today, showDate = false, actions)
            if (state.overdue.isEmpty() && state.today.isEmpty()) {
                item(key = "empty") { EmptyState("Nothing left for today", icon = Icons.Outlined.WbSunny) }
            }
            if (state.completed.isNotEmpty()) {
                item(key = "done-h") {
                    SectionHeader(
                        text = "Completed · ${state.completed.size}",
                        modifier = Modifier.clickable { showCompleted = !showCompleted },
                    ) {
                        Icon(
                            if (showCompleted) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                            contentDescription = if (showCompleted) "Hide completed" else "Show completed",
                            tint = AppTheme.colors.text3,
                        )
                    }
                }
                if (showCompleted) taskItems("c", state.completed, today, showDate = false, actions)
            }
        }
    }
}

internal fun LazyListScope.taskItems(
    prefix: String,
    tasks: List<TaskEntity>,
    today: LocalDate,
    showDate: Boolean,
    actions: TaskActions,
) {
    items(tasks, key = { "$prefix-${it.uuid}" }) { task ->
        SwipeableTaskRow(
            task = task,
            today = today,
            showDate = showDate,
            onToggle = { actions.onToggle(task, it) },
            onDelete = { actions.onDelete(task) },
            onClick = { actions.onEdit(task) },
            modifier = Modifier.padding(horizontal = 16.dp).animateItem(),
        )
    }
}
