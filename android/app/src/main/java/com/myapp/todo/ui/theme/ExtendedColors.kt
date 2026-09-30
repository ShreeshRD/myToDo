package com.myapp.todo.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** Tokens with no Material 3 role: priority, heatmap, status and the extra text/surface steps. */
@Immutable
data class ExtendedColors(
    val p0: Color,
    val p1: Color,
    val p2: Color,
    val p3: Color,
    val p4: Color,
    val heat: List<Color>,
    val text3: Color,
    val surface3: Color,
    val border: Color,
    val borderStrong: Color,
    val danger: Color,
    val dangerSoft: Color,
    val success: Color,
    val successSoft: Color,
    val warning: Color,
    val accentSoft: Color,
) {
    /** 1 = highest … 4 = lowest; anything else is "no priority". */
    fun priority(priority: Int): Color = when (priority) {
        1 -> p1
        2 -> p2
        3 -> p3
        4 -> p4
        else -> p0
    }
}

val LightExtendedColors = with(LightTokens) {
    ExtendedColors(
        p0, p1, p2, p3, p4, heat, text3, surface3, border, borderStrong,
        danger, dangerSoft, success, successSoft, warning, accentSoft,
    )
}

val DarkExtendedColors = with(DarkTokens) {
    ExtendedColors(
        p0, p1, p2, p3, p4, heat, text3, surface3, border, borderStrong,
        danger, dangerSoft, success, successSoft, warning, accentSoft,
    )
}

val LocalExtendedColors = staticCompositionLocalOf { LightExtendedColors }
