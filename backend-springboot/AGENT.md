# Backend (Spring Boot)

## Purpose

Own all Spring Boot backend code: REST API, data layer, configuration, and deployment artifacts.

## Ownership

All files under `backend-springboot/`.

## Local Contracts

- Java 21 required
- Package root: `com.myapp.todo`
- Controller → Service → Repository pattern
- JPA entities map to the SQLite database configured in `application.properties` (`todo.db`)
- REST endpoints serve the frontend via JSON
- Cross-origin requests from frontend are configured in `WebConfig`; allowed origins come from `app.cors.allowed-origin-patterns` (env `APP_CORS_ALLOWED_ORIGIN_PATTERNS`), default `http://localhost:*,http://127.0.0.1:*`
- Recurrence is server-side: completing a recurring task (`/todo/update complete=true` or a sync push) creates the next occurrence via `RecurrenceCalculator` + `TodoService.createNextOccurrence`, returned as `nextItem`; clients must not create occurrences themselves
- Every write goes through `TodoService.touch` (or `SyncService`), which stamps `uuid` and `updatedAt`; deletes are soft (`deleted=true` tombstone) and every read path filters tombstones except `/todo/sync/changes`
- `repeatType` is stored as an enum ordinal: never reorder `RepeatPattern` constants, only append
- `uuid` is not a UNIQUE column (SQLite cannot add one to an existing table); uniqueness is kept by the services
- `SyncBackfill` gives pre-sync rows a `uuid`/`updatedAt` at startup

## Work Guidance

- New endpoints: add controller method, service method, repository method, DTO if needed
- Entity changes: update entity, repository, and any dependent services/controllers
- Configuration changes: document in `application.properties` comments or this doc
- DTOs live in `dto/` subpackage when named types are needed beyond the entity

## Ports

- Dev: **8000** (`server.port=8000` in `application.properties`)
- Prod: **5555** (`application-prod.properties`)
- The jar is `target/todo-<pom version>.jar` (currently `todo-0.1.5.jar`)

## Commands

- **Dev (hot-reload):** `cd backend-springboot && ./mvnw spring-boot:run`
- **Dev (explicit profile):** `cd backend-springboot && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- **Build (JAR):** `cd backend-springboot && ./mvnw clean package`
- **Build (OCI image via buildpacks):** `cd backend-springboot && ./mvnw clean spring-boot:build-image`
- **Prod run:** `cd backend-springboot && SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.1.5.jar`
- **Docker (prod profile, port 5555, DB on the `todo_data` volume):** `cd backend-springboot && docker compose up -d --build`
- **No local JDK 21:** `docker run --rm -v "$PWD":/app -v "$HOME/.m2":/root/.m2 -w /app eclipse-temurin:21-jdk ./mvnw -B test`

## Verification

- `cd backend-springboot && ./mvnw clean compile`
- `cd backend-springboot && ./mvnw test` — 46/46 pass. Surefire loads `mockito-core` as a `-javaagent` (path resolved from `${settings.localRepository}`; version pinned by the Spring Boot parent), so Mockito never self-attaches at runtime — runtime attachment fails on JDK 21+/restricted environments. Integration tests target `127.0.0.1`, not `localhost`, because Reactor Netty resolves via DNS only.

## Child DOX Index

None
