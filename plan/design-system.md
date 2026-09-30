---
title: Design System
scope: frontend-next styling and the Android app theme
---

# myToDo Design System

The look is calm and minimal, in the direction of Linear and Things. It uses neutral greys, a single indigo accent and Inter type. Most separation comes from space and faint borders rather than filled boxes. Colour is reserved for meaning: priority, overdue, and the accent for the current or primary thing.

The source of truth is `frontend-next/styles/tokens.scss`:
- The web app switches themes with `<html data-theme="light|dark|glass">`, which `hooks/useUIState.js` sets.
- The Android app mirrors the light and dark values in `android/app/src/main/java/com/myapp/todo/ui/theme/`.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f7f7f8` | `#0f0f11` | App canvas behind the sidebar |
| `--surface` | `#ffffff` | `#161618` | Main content, cards, popups |
| `--surface-2` | `#f1f1f3` | `#1c1c1f` | Sidebar, inset areas, hover |
| `--surface-3` | `#e8e8ec` | `#26262b` | Pressed or selected neutral |
| `--border` | `#e4e4e8` | `#2a2a2f` | Hairlines, card outlines |
| `--border-strong` | `#d0d0d7` | `#3a3a41` | Inputs, scrollbars |
| `--text` | `#18181b` | `#ededef` | Primary text |
| `--text-2` | `#52525b` | `#a8a8b0` | Secondary text |
| `--text-3` | `#8b8b94` | `#6f6f78` | Meta, placeholders |
| `--accent` | `#5b5bd6` | `#8b8bf5` | Primary buttons, selection, "now" line, links |
| `--accent-soft` | 10% accent | 14% accent | Selected nav item, hover on accent things |
| `--danger` | `#e5484d` | `#f2555a` | Overdue, destructive actions |
| `--success` | `#30a46c` | `#3dd68c` | Completed |
| `--p1`…`--p4` | red / amber / blue / purple | same, lifted | Priority ring on the checkbox and the flag |
| `--p0` | `#a1a1aa` | `#6f6f78` | No priority |
| `--heat-0`…`--heat-5` | grey → indigo | dark grey → indigo | Completion heatmap |

The glass theme keeps the same roles:
- The canvas is a gradient.
- Surfaces are translucent white (`rgba(255,255,255,.08)`), using `--blur` for `backdrop-filter`.
- Text is near-white.

Glass is web-only.

## Type (Inter)

| Role | Size / weight | Where |
|---|---|---|
| Page title | 26 / 700, letter-spacing −0.02em | Header ("Upcoming", "Today") |
| Section | 13 / 600, `--text-2` | Day column headers, sidebar group labels (11 / 600 uppercase, tracking 0.06em) |
| Body | 14 / 400 | Task names, inputs |
| Meta | 12 / 500, `--text-3` | Project tag, time, date under a task |

## Shape and space

- **Radius:** 6px for inputs, chips and small buttons. 10px for cards and menus. 14px for dialogs and panels. Pill shapes for badges and the FAB.
- **Spacing:** a 4px grid (`--space-1`…`--space-8`). Task rows use 10–12px vertical padding. Columns are separated by a 16px gap.
- **Shadows:** `--shadow-sm` on resting cards, used sparingly. `--shadow-md` on hover and dragging. `--shadow-lg` on popovers and dialogs.
- **Motion:** 160ms with `cubic-bezier(.2,0,0,1)`, only on hover, press and open. Nothing loops.

## Components

- **Task row:**
  - A flat surface with a 1px `--border` and a 10px radius. On hover the background becomes `--surface-2` and the border `--border-strong`.
  - The checkbox is an 18px circle whose 1.5px ring uses the priority colour. On hover it fills with 10% of that colour and shows a tick. When checked it fills solid with a white tick.
  - The name is 14px. The meta line is 12px `--text-3`: the time (with a bell icon when a reminder is set), then `# Project`.
  - Overdue tasks use `--danger` for the date text. The whole card is never filled pink.
  - Completed tasks have a struck-through name in `--text-3`.
- **Sidebar:**
  - `--surface-2` background, 264px wide.
  - Nav items are 34px tall with a 6px radius and a 16px icon.
  - The active item uses an `--accent-soft` background with `--accent` text and icon.
  - "Add task" is the accent-coloured primary item at the top.
  - Each project shows a coloured `#` or dot.
- **Header:** 72px tall on `--surface`, with a bottom border of `--border`. It shows the page title, and on the right the date navigation, as ghost icon buttons and a pill-shaped date.
- **Buttons:**
  - Primary: filled `--accent` with `--accent-contrast` text and a 6px radius.
  - Ghost: transparent, `--text-2`, with a `--surface-2` background on hover.
  - Destructive: `--danger` text, with a `--danger-soft` background on hover.
- **Inputs:** `--surface` background, 1px `--border-strong`, 6px radius. On focus they get a 2px accent ring (`--accent` border plus a `--accent-soft` glow).
- **Dialog (create/edit task):**
  - A centred 520px `--surface` card with a 14px radius and `--shadow-lg`, over an `--overlay` backdrop.
  - The title input is borderless at 16px / 600. Below it is a row of chip-style pickers (date, time, reminder, project, priority, repeat). The footer holds the buttons, right-aligned.
- **Menus and popovers:** `--surface` with `--shadow-lg` and a 10px radius. Items are 32px tall and turn `--surface-2` on hover.
- **Empty states:** a centred `--text-3` line, with an optional icon at 40% opacity.

## Android mapping

Material 3 roles map to the tokens as follows:

| Material 3 role | Token |
|---|---|
| `background` | `--bg` |
| `surface` | `--surface` |
| `surfaceVariant` / `surfaceContainer` | `--surface-2` |
| `outline` | `--border-strong` |
| `outlineVariant` | `--border` |
| `onSurface` | `--text` |
| `onSurfaceVariant` | `--text-2` |
| `primary` | `--accent` |
| `onPrimary` | `--accent-contrast` |
| `primaryContainer` | `--accent-soft` |
| `error` | `--danger` |

Priority colours and heat colours are custom `ExtendedColors`. Type uses the system sans-serif at the sizes above, and shapes use 6 / 10 / 14dp.
