package com.myapp.todo.ui

import com.myapp.todo.data.TaskEntity

/** Row callbacks shared by the list screens. */
data class TaskActions(
    val onToggle: (TaskEntity, Boolean) -> Unit,
    val onDelete: (TaskEntity) -> Unit,
    val onEdit: (TaskEntity) -> Unit,
    val onRefresh: () -> Unit,
)
