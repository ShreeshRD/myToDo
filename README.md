Demo website:

Note - Refreshing the page will reset the data.
https://shreeshrd.github.io/myToDo/

Project Details -
Front end and backend interact through a REST API.
Front end is a clone of a popular To Do list app. 
Backend developed with Spring Boot connecting to a local SQLite database (`todo.db`).

Installation notes - npm i
Run and build frontend with:
```
npm run dev
npm run build
```
Run and build backend with:
```
./mvnw spring-boot:run
./mvnw clean package
```
Set profile with - SPRING_PROFILES_ACTIVE=prod

Pre-Requisites - 
Java Version 21
SQLite database file (`todo.db` in `backend-springboot/`)

