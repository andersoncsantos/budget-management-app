# --- STAGE 1: Builder ---
FROM eclipse-temurin:21-jdk-jammy AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy build files and reconstruct cache layers for better caching
COPY gradlew .
COPY gradlew.bat .
COPY gradle gradle/
COPY build.gradle.kts .
COPY settings.gradle.kts .
COPY src src/

# Run the build command (assuming Gradle)
RUN ./gradlew clean assemble -x test

# --- STAGE 2: Runner (Slim Runtime Image) ---
FROM eclipse-temurin:21-jre-jammy

# Set metadata and environment variables for the application
ENV SPRING_PROFILES_ACTIVE=docker \
    SERVER_PORT=8081 \
    SPRING_JPA_HIBERNATE_DDL-AUTO=update

WORKDIR /app

# Copy only the compiled JAR from the builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Expose the port on which the application will listen
EXPOSE 8081

# Command to run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]