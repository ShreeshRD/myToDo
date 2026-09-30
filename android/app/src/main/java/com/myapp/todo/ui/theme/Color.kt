package com.myapp.todo.ui.theme

import androidx.compose.ui.graphics.Color

// Mirrors frontend-next/styles/tokens.scss (light + dark). Spec: plan/design-system.md

object LightTokens {
    val bg = Color(0xFFF7F7F8)
    val surface = Color(0xFFFFFFFF)
    val surface2 = Color(0xFFF1F1F3)
    val surface3 = Color(0xFFE8E8EC)
    val overlay = Color(0x5C111113) // rgba(17,17,19,.36)
    val border = Color(0xFFE4E4E8)
    val borderStrong = Color(0xFFD0D0D7)
    val text = Color(0xFF18181B)
    val text2 = Color(0xFF52525B)
    val text3 = Color(0xFF8B8B94)
    val accent = Color(0xFF5B5BD6)
    val accentHover = Color(0xFF4F4FC4)
    val accentSoft = Color(0x1A5B5BD6) // 10%
    val accentContrast = Color(0xFFFFFFFF)
    val danger = Color(0xFFE5484D)
    val dangerSoft = Color(0x1AE5484D)
    val warning = Color(0xFFF5A524)
    val success = Color(0xFF30A46C)
    val successSoft = Color(0x1F30A46C) // 12%
    val p0 = Color(0xFFA1A1AA)
    val p1 = Color(0xFFE5484D)
    val p2 = Color(0xFFF5A524)
    val p3 = Color(0xFF3E63DD)
    val p4 = Color(0xFF8E4EC6)
    val heat = listOf(
        Color(0xFFECECF0), Color(0xFFD9D9FB), Color(0xFFB4B4F5),
        Color(0xFF8D8DEB), Color(0xFF6C6CDF), Color(0xFF4B4BC9),
    )
}

object DarkTokens {
    val bg = Color(0xFF0F0F11)
    val surface = Color(0xFF161618)
    val surface2 = Color(0xFF1C1C1F)
    val surface3 = Color(0xFF26262B)
    val overlay = Color(0x99000000) // rgba(0,0,0,.6)
    val border = Color(0xFF2A2A2F)
    val borderStrong = Color(0xFF3A3A41)
    val text = Color(0xFFEDEDEF)
    val text2 = Color(0xFFA8A8B0)
    val text3 = Color(0xFF6F6F78)
    val accent = Color(0xFF8B8BF5)
    val accentHover = Color(0xFFA0A0F8)
    val accentSoft = Color(0x248B8BF5) // 14%
    val accentContrast = Color(0xFF0F0F11)
    val danger = Color(0xFFF2555A)
    val dangerSoft = Color(0x24F2555A)
    val warning = Color(0xFFFFB224)
    val success = Color(0xFF3DD68C)
    val successSoft = Color(0x243DD68C)
    val p0 = Color(0xFF6F6F78)
    val p1 = Color(0xFFF2555A)
    val p2 = Color(0xFFFFB224)
    val p3 = Color(0xFF6E8CF5)
    val p4 = Color(0xFFB07EE8)
    val heat = listOf(
        Color(0xFF1F1F23), Color(0xFF2C2C55), Color(0xFF3D3D85),
        Color(0xFF5454B5), Color(0xFF7070DD), Color(0xFF9C9CFF),
    )
}
