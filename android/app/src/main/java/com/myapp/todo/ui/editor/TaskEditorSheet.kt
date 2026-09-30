package com.myapp.todo.ui.editor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.myapp.todo.data.RepeatType
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.data.WeekdayMask
import com.myapp.todo.reminders.ReminderCalculator
import com.myapp.todo.ui.components.DateLabels
import com.myapp.todo.ui.theme.AppTheme
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

/** Create/edit sheet: borderless title, then a row of chip pickers, then the footer buttons. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TaskEditorSheet(
    task: TaskEntity?,
    projects: List<String>,
    today: LocalDate,
    onDismiss: () -> Unit,
    onSave: (TaskEntity) -> Unit,
    onDelete: (TaskEntity) -> Unit,
) {
    var draft by remember(task?.uuid) { mutableStateOf(TaskDraft(task, date = task?.date ?: today)) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val focus = remember { FocusRequester() }
    var picker by remember { mutableStateOf<Picker?>(null) }

    LaunchedEffect(Unit) { if (task == null) focus.requestFocus() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = MaterialTheme.colorScheme.surface) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp),
        ) {
            TextField(
                value = draft.name,
                onValueChange = { draft = draft.copy(name = it) },
                modifier = Modifier.fillMaxWidth().focusRequester(focus),
                placeholder = { Text("Task name") },
                textStyle = MaterialTheme.typography.titleMedium,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 8.dp),
            ) {
                PickerChip(Icons.Outlined.CalendarToday, DateLabels.short(draft.date, today)) { picker = Picker.DATE }
                PickerChip(Icons.Outlined.Schedule, draft.time?.let(DateLabels::time) ?: "Time") { picker = Picker.TIME }
                ReminderChip(draft) { draft = draft.copy(reminderMinutes = it) }
                ProjectChip(draft.project, projects, onPick = { draft = draft.copy(project = it) }, onNew = { picker = Picker.PROJECT })
                PriorityChip(draft.priority) { draft = draft.copy(priority = it) }
                RepeatChip(draft.repeatType) { draft = draft.copy(repeatType = it) }
            }

            RepeatDetails(draft) { draft = it }

            HorizontalDivider(color = AppTheme.colors.border, modifier = Modifier.padding(top = 8.dp))
            Row(
                Modifier.fillMaxWidth().padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (task != null) {
                    TextButton(onClick = { onDelete(task) }) { Text("Delete", color = AppTheme.colors.danger) }
                }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onDismiss) { Text("Cancel") }
                Spacer(Modifier.width(8.dp))
                Button(onClick = { onSave(draft.toEntity()) }, enabled = draft.canSave, shape = MaterialTheme.shapes.small) {
                    Text(if (draft.isNew) "Add task" else "Save")
                }
            }
        }
    }

    when (picker) {
        Picker.DATE -> DatePickerDialogFor(draft.date, onDismiss = { picker = null }) {
            draft = draft.copy(date = it)
            picker = null
        }
        Picker.TIME -> TimePickerDialogFor(
            initial = draft.time,
            onDismiss = { picker = null },
            onClear = {
                draft = draft.copy(time = null, reminderMinutes = null)
                picker = null
            },
        ) {
            draft = draft.copy(time = it)
            picker = null
        }
        Picker.PROJECT -> NewProjectDialog(onDismiss = { picker = null }) {
            draft = draft.copy(project = it)
            picker = null
        }
        null -> Unit
    }
}

private enum class Picker { DATE, TIME, PROJECT }

@Composable
private fun PickerChip(icon: ImageVector, label: String, enabled: Boolean = true, tint: Color? = null, onClick: () -> Unit) {
    AssistChip(
        onClick = onClick,
        enabled = enabled,
        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp), tint = tint ?: AppTheme.colors.text3) },
        shape = MaterialTheme.shapes.small,
        colors = AssistChipDefaults.assistChipColors(labelColor = MaterialTheme.colorScheme.onSurfaceVariant),
    )
}

@Composable
private fun <T> ChipMenu(
    icon: ImageVector,
    label: String,
    options: List<T>,
    optionLabel: (T) -> String,
    enabled: Boolean = true,
    tint: Color? = null,
    footer: (@Composable (close: () -> Unit) -> Unit)? = null,
    onPick: (T) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    Box {
        PickerChip(icon, label, enabled, tint) { open = true }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEach { option ->
                DropdownMenuItem(text = { Text(optionLabel(option)) }, onClick = {
                    open = false
                    onPick(option)
                })
            }
            footer?.invoke { open = false }
        }
    }
}

@Composable
private fun ReminderChip(draft: TaskDraft, onPick: (Int?) -> Unit) {
    val enabled = draft.time != null
    ChipMenu(
        icon = Icons.Outlined.NotificationsNone,
        label = if (!enabled || draft.reminderMinutes == null) "Reminder" else ReminderCalculator.label(draft.reminderMinutes),
        options = ReminderCalculator.OPTIONS,
        optionLabel = ReminderCalculator::label,
        enabled = enabled,
        onPick = onPick,
    )
}

@Composable
private fun ProjectChip(project: String, projects: List<String>, onPick: (String) -> Unit, onNew: () -> Unit) {
    ChipMenu(
        icon = Icons.Outlined.Tag,
        label = project,
        options = (projects + project).distinct(),
        optionLabel = { it },
        footer = { close ->
            DropdownMenuItem(text = { Text("New project…") }, onClick = {
                close()
                onNew()
            })
        },
        onPick = onPick,
    )
}

@Composable
private fun PriorityChip(priority: Int, onPick: (Int) -> Unit) {
    ChipMenu(
        icon = Icons.Outlined.Flag,
        label = if (priority in 1..4) "P$priority" else "Priority",
        options = listOf(1, 2, 3, 4, 0),
        optionLabel = { if (it == 0) "P0 · No priority" else "P$it" },
        tint = AppTheme.colors.priority(priority),
        onPick = onPick,
    )
}

@Composable
private fun RepeatChip(type: RepeatType, onPick: (RepeatType) -> Unit) {
    ChipMenu(
        icon = Icons.Outlined.Repeat,
        label = if (type == RepeatType.NONE) "Repeat" else repeatLabel(type),
        options = RepeatType.entries,
        optionLabel = ::repeatLabel,
        onPick = onPick,
    )
}

private fun repeatLabel(type: RepeatType): String = when (type) {
    RepeatType.NONE -> "Does not repeat"
    RepeatType.EVERY_X_DAYS -> "Every N days"
    RepeatType.EVERY_X_WEEKS -> "Every N weeks"
    RepeatType.EVERY_X_MONTHS -> "Every N months"
    RepeatType.SPECIFIC_WEEKDAYS -> "On weekdays…"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RepeatDetails(draft: TaskDraft, onChange: (TaskDraft) -> Unit) {
    when (draft.repeatType) {
        RepeatType.NONE -> Unit
        RepeatType.SPECIFIC_WEEKDAYS -> FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            WeekdayMask.ORDER.forEach { day ->
                FilterChip(
                    selected = WeekdayMask.contains(draft.weekdayMask, day),
                    onClick = { onChange(draft.copy(weekdayMask = WeekdayMask.toggle(draft.weekdayMask, day))) },
                    label = { Text(day.getDisplayName(TextStyle.NARROW, Locale.getDefault())) },
                )
            }
        }
        else -> {
            val unit = when (draft.repeatType) {
                RepeatType.EVERY_X_DAYS -> "day(s)"
                RepeatType.EVERY_X_WEEKS -> "week(s)"
                else -> "month(s)"
            }
            var text by remember(draft.repeatType) { mutableStateOf(draft.repeatEvery.toString()) }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Every", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = text,
                    onValueChange = { value ->
                        text = value.filter(Char::isDigit).take(3)
                        text.toIntOrNull()?.takeIf { it > 0 }?.let { onChange(draft.copy(repeatEvery = it)) }
                    },
                    modifier = Modifier.width(80.dp),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
                Text(unit, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
