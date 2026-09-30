# Build stage: compile the Spring Boot jar (includes any frontend copied into
# src/main/resources/static by `npm run build` in frontend-next)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B dependency:go-offline
COPY src src
RUN ./mvnw -B package -DskipTests && cp target/todo-*.jar /app/app.jar

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/app.jar app.jar
# SQLite database lives on a volume so it survives container rebuilds
VOLUME /data
ENV SPRING_PROFILES_ACTIVE=prod \
    SPRING_DATASOURCE_URL=jdbc:sqlite:/data/todo.db
EXPOSE 5555
CMD ["java", "-jar", "app.jar"]
