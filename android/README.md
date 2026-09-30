# myToDo for Android

A native Android client (Kotlin, Jetpack Compose, Material 3) for the myToDo personal task manager. It is offline-first: every task lives in a local Room database, the UI reads only from that database, and a background sync keeps it in step with the Spring Boot backend (`backend-springboot/`). It also works with no server at all (local-only mode).

- **Screens:** Today (overdue + today + collapsible Completed), Upcoming (next 30 days, grouped by date with sticky headers), Search (text + All/Active/Completed), Settings.
- **Editing:** "Add task" FAB, or tap a row, to open a bottom sheet with name, date, time, reminder, project, priority P0–P4 and repeat. Swipe right to complete, swipe left to delete; both can be undone from the snackbar.
- **Native reminders:** a notification with a "Mark done" action.
- **Look:** follows `plan/design-system.md`. It uses the light/dark tokens from `frontend-next/styles/tokens.scss`, with dynamic colour off. The theme can be System, Light or Dark (set in Settings).

Minimum Android 8.0 (API 26); targets API 35.

## How sync works

The backend contract is in `plan/backend-endpoints.md` §3.

- **Local edits.** Every create, edit, complete or delete:
  - sets `updatedAt` to now (always moving forward);
  - marks the row `dirty`;
  - gives new tasks a client-generated `uuid`.

  A delete becomes a tombstone (`deleted = true`, dirty). Tombstones are hidden from the UI.
- **A sync round** (`sync/SyncEngine.kt`):
  1. `POST /todo/sync/push` with full snapshots of all dirty rows.
  2. `GET /todo/sync/changes?since=<cursor>`.
  3. Store the response's `serverTime` as the new cursor.

  Every returned item, whether a push acknowledgement or a pulled change, goes through one last-write-wins rule, keyed by `uuid`:
  - If the local row is dirty and newer than the incoming copy (edited again meanwhile), keep the local row. It is pushed next round.
  - Otherwise the server copy replaces the local row and the dirty flag clears.
  - A tombstone deletes the local row.

  Re-running a round changes nothing, so retries are safe. Rounds are serialised with a mutex.
- **Recurring tasks are server-side.** Completing a repeating task on the phone just pushes `complete = true`. The server creates the next occurrence, which arrives in the same push response or on the next pull. The phone never creates occurrences itself.
- **When it runs** (WorkManager, with a network constraint):
  - on app start;
  - after each local edit (expedited one-off work);
  - every 15 minutes (periodic);
  - on pull-to-refresh;
  - from **Sync now** in Settings.
- **Status.** Settings shows the last successful sync and the last error. The list headers show a small "Offline" marker when there is no network or the last sync failed.

## How reminders work

- **When it fires.** A task reminds at `taskDate + assignedTime − reminderMinutesBefore`, in the device's time zone. The pure logic is in `reminders/ReminderCalculator.kt`.
  - Only tasks that have a time and a reminder, and are incomplete and not deleted, get one.
  - Past times are skipped.
  - Whole days are subtracted on the wall clock, so "1 day before" keeps the same local time across a DST change.
- **Scheduling.** `ReminderScheduler` keeps one `AlarmManager` alarm per task, for the soonest 100 reminders.
  - It uses exact alarms when **Alarms & reminders** (`SCHEDULE_EXACT_ALARM`) is allowed.
  - Otherwise it uses a 10-minute `setWindow`.
- **Rescheduling.** All alarms are rebuilt:
  - after every sync;
  - after every local change;
  - on boot, time change, time-zone change and app update;
  - when the exact-alarm permission changes.
- **The notification.** It goes to the "Reminders" channel and shows the task name, time and `# Project`. **Mark done** completes the task locally (dirty) and triggers a sync.
- **Permissions.**
  - On Android 13+ the app asks for the notification permission on first launch.
  - Settings shows the notification and exact-alarm status, with buttons that open the matching system settings.

## Build (Docker only; no local SDK needed)

The build runs in `ghcr.io/cirruslabs/android-sdk:35` (JDK 21, Android platform 35 and build-tools 35), wrapped by `docker/Dockerfile`. It uses the committed Gradle wrapper (Gradle 8.11.1, AGP 8.7.3, Kotlin 2.1). A named volume caches Gradle downloads, so reruns are fast.

The image is `linux/amd64` on purpose: AGP's `aapt2` is x86_64-only. On Apple Silicon it runs under Rosetta. The first build takes about 8 minutes; cached rebuilds take 1–3 minutes.

From `android/`, the helper script:

```bash
docker/gradle.sh assembleDebug testDebugUnitTest lint
```

It builds the image the first time, then runs `./gradlew` inside it. The equivalent raw commands are:

```bash
docker build --platform linux/amd64 -t mytodo-android-build docker
docker volume create mytodo-gradle-cache
docker run --rm --platform linux/amd64 \
  -v "$PWD":/project -v mytodo-gradle-cache:/gradle-cache \
  -w /project mytodo-android-build \
  ./gradlew --no-daemon --no-watch-fs assembleDebug testDebugUnitTest lint
```

Outputs:
- APK: `app/build/outputs/apk/debug/app-debug.apk`
- Unit test report: `app/build/reports/tests/testDebugUnitTest/index.html`
- Lint report: `app/build/reports/lint-results-debug.html`

The wrapper was generated with `docker run --rm -v "$PWD":/w -w /w gradle:8.11-jdk17 gradle wrapper --gradle-version 8.11.1`.

## Release builds (GitHub Actions)

`.github/workflows/android-release.yml` runs whenever a GitHub release with an `android-` tag (e.g. `android-v1.2`) is published; other releases skip it. It checks out the release tag, runs the unit tests, builds the debug APK and attaches `myToDo-android-<version>-debug.apk` (the tag without its `android-` prefix) plus a `.sha256` file to that release. To rebuild an existing release, use **Actions → Android APK → Run workflow** with its tag. This needs the workflow on the default branch. Bump `versionCode`/`versionName` in `app/build.gradle.kts` before tagging, so phones install the new APK as an update.

## Install

Either:
- `adb install -r app/build/outputs/apk/debug/app-debug.apk` (USB debugging or `adb pair`/`adb connect` over Wi-Fi); or
- copy `app-debug.apk` to the phone and open it. Allow "Install unknown apps" for the file manager you open it from.

The debug build is signed with the SDK's debug key. Installing a build made on another machine may need an uninstall first, because the signatures differ.

## Connect to the server

1. Run the backend so it is reachable from the phone. Spring binds `0.0.0.0` by default. The docker-compose setup exposes port `5555`; `./mvnw spring-boot:run` uses `8000`.
2. In the app, open **Settings → Server URL**. A prompt also appears on first launch. Enter one of:
   - a LAN address, e.g. `http://192.168.1.20:5555`;
   - a Tailscale address, e.g. `http://my-server:5555` (MagicDNS) or `http://100.x.y.z:5555`;
   - on the Android emulator, `http://10.0.2.2:5555` (the host machine).

   The scheme is optional (`192.168.1.20:5555` works). A path prefix is kept if the backend sits behind a reverse proxy.
3. Tap **Save**. A sync starts straight away; use **Sync now** to retry.

Notes:
- **Cleartext HTTP is allowed** (`res/xml/network_security_config.xml`) because a home server usually has no TLS. HTTPS works too.
- **CORS does not apply** to native apps, so `app.cors.allowed-origin-patterns` needs no change.
- **Changing the URL** resets the pull cursor, so everything is fetched again. Unsynced local changes are still pushed.
- **Leave the URL empty** for local-only mode.

## Code map (`app/src/main/java/com/myapp/todo/`)

| Package | Contents |
|---|---|
| `AppContainer`, `TodoApp`, `MainActivity` | Manual DI, app start-up (channels, periodic sync, reminders), Compose entry |
| `data/` | Room entity/DAO/database, `TaskRepository` (all local edits), `SettingsRepository` (DataStore: URL, cursor, sync status, theme), `WeekdayMask`, `TimeFormats`, `RepeatType` |
| `data/remote/` | kotlinx.serialization DTOs matching the backend JSON, Retrofit `SyncApi`, `RetrofitSyncRemote` |
| `sync/` | `SyncEngine` (pure), `LocalTaskStore` (+ Room implementation), `SyncWorker`, `SyncScheduler`, `NetworkMonitor` |
| `reminders/` | `ReminderCalculator` (pure), `ReminderScheduler` (AlarmManager), `ReminderNotifier`, `ReminderReceiver` (fire / mark done), `RescheduleReceiver` (boot / time / TZ) |
| `ui/theme/` | Colour tokens (light/dark), `ExtendedColors` (priority, heat, status), type scale, 6/10/14dp shapes |
| `ui/` | `MainScreen` (bottom nav, FAB, snackbar), view models, `TaskGrouping` (pure list shaping), screens in `today/`, `upcoming/`, `search/`, `settings/`, `editor/`, shared `components/` |

Unit tests (`app/src/test/`) run on the JVM:
- `SyncEngine` against MockWebServer and an in-memory store: push, pull, cursor, conflicts, edits during push/pull, tombstones, next occurrences, idempotency and error handling.
- JSON (de)serialisation of the backend's exact formats.
- Reminder time computation: midnight crossing, day-before, DST, past times and the alarm cap.
- The weekday mask.
- Today/Upcoming/Search grouping, the editor draft and the repository's stamping rules.

## Limitations

- **Not UI-tested.** There is no emulator in the build environment, so the UI has only been compiled, linted and checked by review; there are no instrumented tests.
- **The phone is trusted.** Last write wins uses each device's clock, so a phone clock far behind the server can lose edits.
- **Some fields are not editable.** Project reordering and `inProgress`/`longTerm`/`timeTaken` can't be changed on the phone, but they are preserved and round-tripped.
- **Tombstones stay** until a server acknowledges them. In local-only mode, deleted tasks stay hidden in the database.
