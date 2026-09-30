package com.myapp.todo.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

// Dynamic colour is deliberately off so the brand palette holds on every device.
private val LightScheme: ColorScheme = with(LightTokens) {
    lightColorScheme(
        primary = accent, onPrimary = accentContrast,
        primaryContainer = accentSoft, onPrimaryContainer = accent,
        secondary = accent, onSecondary = accentContrast,
        secondaryContainer = accentSoft, onSecondaryContainer = accent,
        tertiary = p4, onTertiary = accentContrast,
        background = bg, onBackground = text,
        surface = surface, onSurface = text,
        surfaceVariant = surface2, onSurfaceVariant = text2,
        surfaceTint = surface,
        surfaceBright = surface, surfaceDim = surface2,
        surfaceContainerLowest = surface, surfaceContainerLow = surface,
        surfaceContainer = surface2, surfaceContainerHigh = surface,
        surfaceContainerHighest = surface3,
        inverseSurface = text, inverseOnSurface = surface, inversePrimary = DarkTokens.accent,
        outline = borderStrong, outlineVariant = border,
        error = danger, onError = accentContrast,
        errorContainer = dangerSoft, onErrorContainer = danger,
        scrim = overlay,
    )
}

private val DarkScheme: ColorScheme = with(DarkTokens) {
    darkColorScheme(
        primary = accent, onPrimary = accentContrast,
        primaryContainer = accentSoft, onPrimaryContainer = accent,
        secondary = accent, onSecondary = accentContrast,
        secondaryContainer = accentSoft, onSecondaryContainer = accent,
        tertiary = p4, onTertiary = accentContrast,
        background = bg, onBackground = text,
        surface = surface, onSurface = text,
        surfaceVariant = surface2, onSurfaceVariant = text2,
        surfaceTint = surface,
        surfaceBright = surface3, surfaceDim = bg,
        surfaceContainerLowest = bg, surfaceContainerLow = surface,
        surfaceContainer = surface2, surfaceContainerHigh = surface2,
        surfaceContainerHighest = surface3,
        inverseSurface = text, inverseOnSurface = surface, inversePrimary = LightTokens.accent,
        outline = borderStrong, outlineVariant = border,
        error = danger, onError = accentContrast,
        errorContainer = dangerSoft, onErrorContainer = danger,
        scrim = overlay,
    )
}

@Composable
fun MyToDoTheme(darkTheme: Boolean, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalExtendedColors provides if (darkTheme) DarkExtendedColors else LightExtendedColors) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkScheme else LightScheme,
            typography = AppTypography,
            shapes = AppShapes,
            content = content,
        )
    }
}

/** Access to the extended tokens: `AppTheme.colors.p1`. */
object AppTheme {
    val colors: ExtendedColors
        @Composable @ReadOnlyComposable
        get() = LocalExtendedColors.current
}
