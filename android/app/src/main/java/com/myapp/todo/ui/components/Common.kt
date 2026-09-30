package com.myapp.todo.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.myapp.todo.ui.theme.AppTheme

/** Page header: 26/700 title, optional subtitle, subtle offline chip on the right. */
@Composable
fun ScreenHeader(title: String, subtitle: String? = null, offline: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.text3)
            }
        }
        if (offline) OfflineIndicator()
    }
}

@Composable
fun OfflineIndicator() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(Icons.Outlined.CloudOff, contentDescription = null, modifier = Modifier.size(14.dp), tint = AppTheme.colors.text3)
        Text("Offline", style = MaterialTheme.typography.labelMedium, color = AppTheme.colors.text3)
    }
}

@Composable
fun SectionHeader(text: String, modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.onSurfaceVariant, trailing: @Composable () -> Unit = {}) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, style = MaterialTheme.typography.titleSmall, color = color, modifier = Modifier.weight(1f))
        trailing()
    }
}

@Composable
fun EmptyState(text: String, modifier: Modifier = Modifier, icon: ImageVector? = null) {
    Box(modifier.fillMaxWidth().padding(vertical = 48.dp, horizontal = 24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(40.dp), tint = AppTheme.colors.text3.copy(alpha = 0.4f))
            }
            Text(text, style = MaterialTheme.typography.bodyMedium, color = AppTheme.colors.text3)
        }
    }
}
