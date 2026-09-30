# myToDo

A personal task manager: a Spring Boot + SQLite backend, a Next.js web app, a native Android app with offline sync, and an optional AI agent app.

**Full guide:** [`plan/project-overview.md`](plan/project-overview.md) covers architecture, features, and how to run and test every part.

## Quick start

Prerequisites: Java 21 (or Docker), Node.js.

```bash
# Backend — http://localhost:8000
cd backend-springboot && ./mvnw spring-boot:run

# Web app — http://localhost:3001
cd frontend-next && npm install && npm run dev
```

No local JDK 21? Run the backend with Docker instead: `cd backend-springboot && docker compose up -d --build` (prod profile, port 5555).

## Production

```bash
cd frontend-next && npm run build          # static UI copied into the backend
cd ../backend-springboot && ./mvnw clean package
SPRING_PROFILES_ACTIVE=prod java -jar target/todo-0.1.5.jar   # port 5555
```

`update-prod.sh` builds the jar if needed and copies it to the prod directory.

Demo (data resets on refresh): https://shreeshrd.github.io/myToDo/
