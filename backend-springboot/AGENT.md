# Backend (Spring Boot)

## Purpose

Own all Spring Boot backend code: REST API, data layer, configuration, and deployment artifacts.

## Ownership

All files under `backend-springboot/`.

## Local Contracts

- Java 21 required
- Package root: `com.myapp.todo`
- Controller → Service → Repository pattern
- JPA entities map to the SQLite database configured in `application.properties` (`todo-dev.db` for dev, `todo.db` for prod)
- REST endpoints serve the frontend via JSON
- Cross-origin requests from frontend are configured in `WebConfig`
- Query endpoints: `/todo/query`, `/todo/count`, `/todo/item/{id}`, `/todo/projects`
- Multi-field task edits use `POST /todo/patch/{id}` (JSON map) so a task keeps its ID; the single-field `/todo/update` remains for simple mutations
- Embedded checklists use `Subtask` (`taskId`, `title`, `done`, `sortOrder`): `GET/POST /todo/subtasks/{taskId}`, `PATCH/DELETE /todo/subtasks/item/{id}`, `POST /todo/subtasks/{taskId}/reorder`, `GET /todo/subtasks/counts/all` for task-row badges
- Push ("not in my hands") uses `POST /todo/push?id=&reason=&date=`: completes the original, records a `PUSHED` event with the reason + destination, and creates a deferred clone on `date` (default `+1` day) carrying `category`, `name`, `priority`, `longTerm`, `description`, repeat settings and only unchecked subtasks. Both rows share `chainRootId`; the clone has `pushedFromId` and both keep `pushCount`. Push never creates a recurrence occurrence — the clone is the next occurrence
- Re-opening a pushed task (`complete=false`) deletes its deferred clone only while that clone is untouched (not complete, no `timeTaken`, no events beyond `CREATED`, no checked subtasks); otherwise the clone is kept and `TodoOperationResult.warning` is set
- Deleting a task also deletes its subtasks and timeline events
- Completion sets `completedAt` and must never overwrite `assignedTime` (scheduled time)
- `LegacyDataBackfill` fills `createdAt`/`completedAt` for pre-existing rows on startup
- Query filtering is in-memory in `TodoService`; acceptable for the current dataset size
- Do not wrap `save(...)` of a new entity in an outer `@Transactional` when the method also reads first: SQLite then holds a read lock while Hibernate's table-sequence generator commits on a second connection, which fails with `SQLITE_BUSY`. Keep `@Transactional` for delete-only methods (`SubtaskService`, `TaskEventService`)

## Work Guidance

- New endpoints: add controller method, service method, repository method, DTO if needed
- Entity changes: update entity, repository, and any dependent services/controllers
- Configuration changes: document in `application.properties` comments or this doc
- DTOs live in `dto/` subpackage when named types are needed beyond the entity

## Ports

- Dev: **8000** (`server.port=8000` in `application.properties`)
- Prod: **5555** (`application-prod.properties`)
- Build prod with - SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.0.1-SNAPSHOT.jar`

## Commands

- **Dev (hot-reload):** `cd backend-springboot && ./mvnw spring-boot:run`

- **Build (JAR):** `cd backend-springboot && ./mvnw clean package`
- **Build (Uber JAR):** `cd backend-springboot && ./mvnw clean spring-boot:build-image`
- **Prod run:** `cd backend-springboot && SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.0.1-SNAPSHOT.jar`

## Verification

- `cd backend-springboot && ./mvnw clean compile`
- `cd backend-springboot && ./mvnw test`

## Child DOX Index

None
