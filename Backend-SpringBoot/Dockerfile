FROM openjdk:21-jdk-slim
# Set the working directory in docker
WORKDIR /app

COPY pom.xml /app/

# Copy the Maven wrapper and dependencies
COPY mvnw /app/
COPY .mvn /app/.mvn

# Download the dependencies
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the application code
COPY . /app

# Build the application
RUN ./mvnw package -DskipTests

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["java", "-jar", "target/todo-0.0.1-SNAPSHOT.jar"]