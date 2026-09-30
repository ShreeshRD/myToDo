# Android App (`android`)

## Purpose

Own the native Android client: Kotlin + Jetpack Compose (Material 3), offline-first, syncing with the Spring Boot backend and firing native task reminders.

## Ownership

All files under `android/`.

## Local Contracts

- Room (`data/`) is the UI's source of truth; every local edit goes through `TaskRepository`, which stamps `updatedAt`, sets `dirty`, generates `uuid` for new tasks and turns deletes into tombstones
- Sync (`sync/SyncEngine.kt`) uses only `GET /todo/sync/changes` and `POST /todo/sync/push` (contract: `plan/backend-endpoints.md` §3); conflicts resolve per task by last write wins on `updatedAt`
- The phone never creates recurring occurrences — the backend does, and they arrive on the next sync
- Reminders fire at `taskDate + assignedTime − reminderMinutesBefore` (device time zone), computed in `reminders/ReminderCalculator.kt`; all alarms are rebuilt after every sync/edit and on boot, time and time-zone changes
- Theme (`ui/theme/`) mirrors `frontend-next/styles/tokens.scss` per `plan/design-system.md`; dynamic colour stays off
- Wire formats: `taskDate` `yyyy-MM-dd`, `assignedTime` `HH:mm:ss`, `repeatType` enum names, SPECIFIC_WEEKDAYS mask bit 64 = Monday … bit 1 = Sunday

## Work Guidance

- Keep sync and reminder logic in pure, JVM-testable classes; Android framework glue stays thin
- Room schema changes need a version bump and a migration; exported schemas live in `app/schemas/`

## Verification

- `cd android && docker/gradle.sh assembleDebug testDebugUnitTest lint` (Docker, amd64 image; 40/40 tests)
- No emulator is available in this environment; on-device behaviour (notifications, alarms, UI) is verified manually by installing `app/build/outputs/apk/debug/app-debug.apk`

## Child DOX Index

None
