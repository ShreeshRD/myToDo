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
- Cross-origin requests from frontend are configured in `WebConfig`

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
- **Dev (explicit profile):** `cd backend-springboot && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- **Build (JAR):** `cd backend-springboot && ./mvnw clean package`
- **Build (Uber JAR):** `cd backend-springboot && ./mvnw clean spring-boot:build-image`
- **Prod run:** `cd backend-springboot && SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.0.1-SNAPSHOT.jar`

## Verification

- `cd backend-springboot && ./mvnw clean compile`
- `cd backend-springboot && ./mvnw test`

## Child DOX Index

None
