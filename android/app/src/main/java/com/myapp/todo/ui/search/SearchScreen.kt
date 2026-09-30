package com.myapp.todo.ui.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.myapp.todo.data.TaskEntity
import com.myapp.todo.ui.SearchFilter
import com.myapp.todo.ui.TaskActions
import com.myapp.todo.ui.components.EmptyState
import com.myapp.todo.ui.components.ScreenHeader
import com.myapp.todo.ui.today.taskItems
import java.time.LocalDate

@Composable
fun SearchScreen(
    query: String,
    onQueryChange: (String) -> Unit,
    filter: SearchFilter,
    onFilterChange: (SearchFilter) -> Unit,
    results: List<TaskEntity>,
    today: LocalDate,
    actions: TaskActions,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        item(key = "header") { ScreenHeader("Search") }
        item(key = "field") {
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                placeholder = { Text("Search tasks") },
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { onQueryChange("") }) { Icon(Icons.Outlined.Close, contentDescription = "Clear") }
                    }
                },
                singleLine = true,
                shape = MaterialTheme.shapes.small,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                textStyle = MaterialTheme.typography.bodyMedium,
            )
        }
        item(key = "filters") {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SearchFilter.entries.forEach { f ->
                    FilterChip(
                        selected = f == filter,
                        onClick = { onFilterChange(f) },
                        label = { Text(f.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
        }
        if (results.isEmpty()) {
            item(key = "empty") {
                EmptyState(if (query.isBlank()) "No tasks yet" else "No tasks match “$query”", icon = Icons.Outlined.Search)
            }
        }
        taskItems("s", results, today, showDate = true, actions)
    }
}
