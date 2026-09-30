package com.myapp.todo.ui.upcoming

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.myapp.todo.ui.DayGroup
import com.myapp.todo.ui.TaskActions
import com.myapp.todo.ui.components.DateLabels
import com.myapp.todo.ui.components.EmptyState
import com.myapp.todo.ui.components.ScreenHeader
import com.myapp.todo.ui.components.SectionHeader
import com.myapp.todo.ui.today.taskItems
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun UpcomingScreen(
    groups: List<DayGroup>,
    today: LocalDate,
    syncing: Boolean,
    offline: Boolean,
    actions: TaskActions,
) {
    PullToRefreshBox(isRefreshing = syncing, onRefresh = actions.onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            item(key = "header") { ScreenHeader("Upcoming", "Next 30 days", offline) }
            if (groups.isEmpty()) {
                item(key = "empty") { EmptyState("No upcoming tasks", icon = Icons.Outlined.CalendarMonth) }
            }
            for (group in groups) {
                stickyHeader(key = "h-${group.date}") {
                    SectionHeader(
                        text = DateLabels.header(group.date, today),
                        modifier = Modifier.background(MaterialTheme.colorScheme.background),
                    )
                }
                taskItems("u", group.tasks, today, showDate = false, actions)
            }
        }
    }
}
