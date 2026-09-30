package com.myapp.todo.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.myapp.todo.ui.theme.AppTheme

/**
 * 18dp circle with a 1.5dp priority-coloured ring; checked fills solid with a white tick.
 * The touch target is 40dp around it.
 */
@Composable
fun PriorityCheckbox(
    checked: Boolean,
    priority: Int,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val color = AppTheme.colors.priority(priority)
    Box(
        modifier = modifier
            .size(40.dp)
            .toggleable(value = checked, role = Role.Checkbox, onValueChange = onCheckedChange),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(18.dp)) {
            val stroke = 1.5.dp.toPx()
            val radius = size.minDimension / 2
            if (checked) {
                drawCircle(color = color, radius = radius)
                val tick = Path().apply {
                    moveTo(size.width * 0.28f, size.height * 0.52f)
                    lineTo(size.width * 0.44f, size.height * 0.68f)
                    lineTo(size.width * 0.73f, size.height * 0.36f)
                }
                drawPath(tick, Color.White, style = Stroke(width = 1.8.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            } else {
                drawCircle(color = color.copy(alpha = if (priority in 1..4) 0.10f else 0f), radius = radius)
                drawCircle(
                    color = color,
                    radius = radius - stroke / 2,
                    center = Offset(size.width / 2, size.height / 2),
                    style = Stroke(width = stroke),
                )
            }
        }
    }
}
