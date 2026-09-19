# ==========================================
# Multi-Stage Production Dockerfile for Spring Boot 3
# ==========================================

# Stage 1: Build Stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build

# Copy Maven wrapper & pom.xml first for caching layer dependencies
COPY backend-spring/.mvn/ .mvn/
COPY backend-spring/mvnw backend-spring/pom.xml ./
RUN chmod +x ./mvnw

# Download dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy source code and build production jar
COPY backend-spring/src ./src
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Minimal Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built jar from builder stage
COPY --from=builder /build/target/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080

# Production JVM Flags: Container support, G1GC, and 75% RAM limit
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

