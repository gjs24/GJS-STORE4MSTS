# 🎓 Learn Java Full-Stack: MSTS-GJS Production Store Edition

Welcome to the **Java Full-Stack Master Project**! This directory completely recreates the MSTS-GJS Production Store as an enterprise-grade Java 21+ and Spring Boot 3 full-stack architecture.

---

## 📂 Directory Roadmap

| File / Folder | Purpose |
|---|---|
| [`01-IDEA-FLOW-AND-ARCHITECTURE.md`](./01-IDEA-FLOW-AND-ARCHITECTURE.md) | **Start Here!** The mental model: How HTTP requests flow from Next.js &rarr; Spring Security &rarr; Controller &rarr; Service &rarr; JPA &rarr; PostgreSQL. |
| [`02-JAVA-MASTER-ROADMAP.md`](./02-JAVA-MASTER-ROADMAP.md) | The 8-Stage syllabus taking you from Java beginner to Senior Full-Stack Architect. |
| [`03-DJANGO-TO-SPRING-BOOT-MAPPING.md`](./03-DJANGO-TO-SPRING-BOOT-MAPPING.md) | Line-by-line comparison of this store's Django models, serializers, and views mapped directly to Java. |
| [`04-HOSTING-AND-DEPLOYMENT-GUIDE.md`](./04-HOSTING-AND-DEPLOYMENT-GUIDE.md) | Complete step-by-step hosting guide: Free cloud (Render + Neon), Docker, Linux VPS + Nginx SSL, CI/CD. |
| [`backend-spring/`](./backend-spring/) | **Working Spring Boot 3 Backend Application** with JWT auth, entities, repositories, REST controllers, seed data, and Swagger UI. |
| [`frontend-integration/`](./frontend-integration/) | How to connect your Next.js frontend to this Spring Boot backend (Axios/Fetch client with JWT interceptor). |
| [`deploy/`](./deploy/) | Dockerfile, `docker-compose.yml`, Nginx reverse proxy configs, and VPS automation scripts. |

---

## ⚡ Quick Start: Running the Java Backend in 60 Seconds

You do **not** need PostgreSQL installed to test locally. The application includes an in-memory **H2 database** preloaded with Indian Railways categories, train assets, and board templates!

### On Windows:
Open PowerShell in `learn-java/backend-spring` and run:
```powershell
cd learn-java\backend-spring
.\mvnw.cmd spring-boot:run
```
*(If Maven is already installed globally, you can also simply run `mvn spring-boot:run`)*

### On Linux / Mac:
```bash
cd learn-java/backend-spring
./mvnw spring-boot:run
```

Once started:
- 🌐 **Interactive API Playground (Swagger UI)**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- 🗄️ **H2 In-Memory Database Console**: [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (JDBC URL: `jdbc:h2:mem:msts_store_db`, User: `sa`, Password: *blank*)
- 🩺 **Health Check**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- 🚂 **Train Assets Catalog**: [http://localhost:8080/api/v1/assets](http://localhost:8080/api/v1/assets)

---

## 🌟 What This Project Demonstrates
1. **Zero-Boilerplate Architecture**: Uses Java 21 Records for DTOs and Lombok for entities.
2. **Type Safety & Security**: Spring Security 6 with stateless JWT Bearer tokens and BCrypt password encryption.
3. **Database Relationships**: JPA `@ManyToOne`, `@OneToMany`, `@ManyToMany` with cascading and orphan removal.
4. **Resilient Transactions**: `@Transactional` rollbacks on payment and order errors.
5. **Real-World Feature Parity**:
   - Indian Railway train categories (Electric Locomotives, Diesel, Coaches, LED Boards).
   - Cashfree / UPI payment status lifecycle (PENDING &rarr; PAID &rarr; CANCELLED).
   - Delete pending orders endpoint (`/api/v1/admin/orders/{id}/pending`).
   - LED Railway Board Studio templates & Quick Presets (Tamil Nadu Exp, Karnataka Exp, Amrit Bharat).

