package com.myapp.todo.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.ui.theme.AppTheme
import java.time.LocalDate

/** Task card: priority checkbox, name, meta line (date, time + bell, repeat, # Project). */
@Composable
fun TaskRow(
    task: TaskEntity,
    today: LocalDate,
    showDate: Boolean,
    onToggle: (Boolean) -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val date = task.date
    val overdue = !task.complete && date != null && date.isBefore(today)
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, colors.border),
    ) {
        Row(
            modifier = Modifier
                .clickable(onClick = onClick)
                .padding(start = 4.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PriorityCheckbox(checked = task.complete, priority = task.priority, onCheckedChange = onToggle)
            Column(Modifier.weight(1f).padding(vertical = 4.dp)) {
                Text(
                    text = task.name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (task.complete) colors.text3 else MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (task.complete) TextDecoration.LineThrough else null,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                MetaLine(task, today, showDate || overdue, overdue)
            }
        }
    }
}

@Composable
private fun MetaLine(task: TaskEntity, today: LocalDate, showDate: Boolean, overdue: Boolean) {
    val colors = AppTheme.colors
    val meta = MaterialTheme.typography.labelMedium
    val date = task.date
    val time = task.time
    val hasAny = (showDate && date != null) || time != null || task.isRepeating || task.category.isNotBlank()
    if (!hasAny) return
    Row(
        modifier = Modifier.padding(top = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showDate && date != null) {
            Text(DateLabels.short(date, today), style = meta, color = if (overdue) colors.danger else colors.text3)
        }
        if (time != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (task.hasReminder) {
                    Icon(
                        Icons.Outlined.NotificationsNone, contentDescription = "Reminder",
                        modifier = Modifier.size(13.dp).padding(end = 2.dp), tint = colors.text3,
                    )
                }
                Text(DateLabels.time(time), style = meta, color = colors.text3)
            }
        }
        if (task.isRepeating) {
            Icon(Icons.Outlined.Repeat, contentDescription = "Repeats", modifier = Modifier.size(13.dp), tint = colors.text3)
        }
        if (task.category.isNotBlank()) {
            Text("# ${task.category}", style = meta, color = colors.text3, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** Swipe right to complete (or reopen), swipe left to delete. The row snaps back; data drives removal. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SwipeableTaskRow(
    task: TaskEntity,
    today: LocalDate,
    showDate: Boolean,
    onToggle: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val toggle by rememberUpdatedState { onToggle(!task.complete) }
    val delete by rememberUpdatedState(onDelete)
    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            when (value) {
                SwipeToDismissBoxValue.StartToEnd -> toggle()
                SwipeToDismissBoxValue.EndToStart -> delete()
                SwipeToDismissBoxValue.Settled -> Unit
            }
            false
        },
    )
    SwipeToDismissBox(
        state = state,
        modifier = modifier,
        backgroundContent = {
            val direction = state.dismissDirection
            val colors = AppTheme.colors
            val (bg, icon, align) = when (direction) {
                SwipeToDismissBoxValue.StartToEnd -> Triple(colors.successSoft, Icons.Outlined.Check, Alignment.CenterStart)
                SwipeToDismissBoxValue.EndToStart -> Triple(colors.dangerSoft, Icons.Outlined.Delete, Alignment.CenterEnd)
                SwipeToDismissBoxValue.Settled -> Triple(Color.Transparent, null, Alignment.Center)
            }
            val tint = if (direction == SwipeToDismissBoxValue.StartToEnd) colors.success else colors.danger
            Surface(Modifier.fillMaxSize(), shape = MaterialTheme.shapes.medium, color = bg) {
                Box(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentAlignment = align) {
                    if (icon != null) Icon(icon, contentDescription = null, tint = tint)
                }
            }
        },
    ) {
        TaskRow(task = task, today = today, showDate = showDate, onToggle = onToggle, onClick = onClick)
    }
}
