# 🚀 Java Full-Stack Master Roadmap: Zero to Senior Architect

This curriculum takes you from absolute beginner to master Java Full-Stack developer. Every concept is explained through real examples from your **MSTS-GJS Production Store**.

---

## 📅 The 8-Stage Learning Journey

```
Stage 1: Core Java 21+ Fundamentals  ──►  Stage 2: OOP & Modern Java
                     │                                   │
                     ▼                                   ▼
Stage 4: Spring Data JPA & Hibernate ◄──  Stage 3: Spring Boot 3 Core
                     │
                     ▼
Stage 5: Spring Security 6 & JWT     ──►  Stage 6: REST APIs & Error Handling
                                                         │
                                                         ▼
Stage 8: Cloud Hosting & CI/CD       ◄──  Stage 7: Next.js Full-Stack Wiring
```

---

## Stage 1: Java 21+ Language Fundamentals

### 1.1 Primitives vs Reference Types
In Python, everything is an object. In Java, primitives store direct values in memory (fast and low footprint):
- `int` / `long` (e.g., asset download count, order ID)
- `double` / `BigDecimal` (Always use `BigDecimal` for currency and prices like ₹15.00 to avoid floating-point math rounding bugs!)
- `boolean` (e.g., `isFree`, `isPublished`)
- `String` (Text: train title, SKU, route names)

### 1.2 Java Syntax & Control Flow
```java
// Method declaration: Type must be explicit
public boolean canUserDownload(User user, Asset asset) {
    if (asset.isFree()) {
        return true;
    }
    return user.hasPurchased(asset);
}
```

### 1.3 Modern Java Feature: Records (Data Carriers)
Instead of writing 50 lines of boilerplate getters, setters, and constructors, Java Records give you clean, immutable data carriers in 1 line:
```java
public record AssetSummaryDto(Long id, String title, BigDecimal price, boolean isFree) {}
```

---

## Stage 2: Object-Oriented Programming (OOP) & Modern Java

### 2.1 The 4 Pillars of OOP applied to MSTS Store
1. **Encapsulation**: Private fields with controlled getters/setters protecting state (e.g. preventing negative prices or direct order tampering).
2. **Inheritance**: Base entity with `id`, `createdAt`, `updatedAt` extended by `Asset`, `Order`, `Category`.
3. **Polymorphism**: Different payment providers (`CashfreePaymentProcessor`, `UpiPaymentProcessor`) implementing a common `PaymentProcessor` interface.
4. **Abstraction**: Calling `paymentProcessor.charge(order)` without caring about the underlying HTTP call or API keys.

### 2.2 Collections Framework
- `List<Asset>`: Ordered list of train assets (preserves sequence).
- `Set<Role>`: Unique user roles (prevents duplicate `ROLE_USER`).
- `Map<String, String>`: Key-value pairs (e.g. board slot names & values: `train_number -> 12621`).

### 2.3 Functional Programming: Streams & Lambdas
Process collections declaratively without clunky `for` loops:
```java
// Filter free train assets and extract their titles in 3 lines:
List<String> freeAssetTitles = assets.stream()
    .filter(Asset::isFree)
    .map(Asset::getTitle)
    .toList();
```

---

## Stage 3: Spring Boot 3 Core & Dependency Injection

### 3.1 What is Inversion of Control (IoC)?
In standard Java:
```java
// Tightly coupled: hard to test or swap
OrderService orderService = new OrderService(new OrderRepository(), new CashfreeClient());
```
In Spring Boot:
Spring scans your classes, discovers `@Service`, `@Repository`, `@Component`, instantiates them as **Beans**, and injects them automatically via **Constructor Injection**:
```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    // Spring passes the registered bean here automatically!
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

### 3.2 Spring Profiles (`dev` vs `prod`)
Spring allows switching environments seamlessly in `application.yml`:
- `dev`: In-memory H2 database, debug logging, local Swagger UI.
- `prod`: Neon PostgreSQL, HTTPS, Cashfree live credentials, AWS S3 storage.

---

## Stage 4: Spring Data JPA & Hibernate (Database Mastery)

### 4.1 Entities & Relationships
- `@OneToMany`: One `Category` has many `Assets`.
- `@ManyToOne`: Many `Orders` belong to one `User`.
- `@ManyToMany`: `Asset` early access requirements.
- `@Enumerated(EnumType.STRING)`: Store enum values as readable strings in SQL (`PENDING`, `PAID`) instead of error-prone numeric indexes.

### 4.2 Derived Query Methods
You never need to write raw SQL for standard queries:
```java
// Just declare method signatures!
List<Asset> findByCategorySlugAndIsPublishedTrue(String categorySlug);
Optional<Asset> findBySlug(String slug);
boolean existsByOrderNumber(String orderNumber);
```

### 4.3 Transactions (`@Transactional`)
Ensures that if an error happens in a multi-step operation (e.g. marking an order `PAID` and granting the board unlock), all operations roll back so your database is never corrupted.

---

## Stage 5: Spring Security 6 & JWT (JSON Web Tokens)

### 5.1 How Stateless JWT Works
1. User submits `POST /api/v1/auth/login` with email and password.
2. Spring's `AuthenticationManager` verifies the BCrypt hash.
3. `JwtTokenProvider` signs a JWT containing the user's email, ID, and roles (`ROLE_USER`, `ROLE_ADMIN`).
4. Next.js stores the token in `localStorage` / HTTP-only cookie.
5. On every subsequent request, Next.js sends header: `Authorization: Bearer <token>`.
6. `JwtAuthenticationFilter` intercepts the request, validates the signature, extracts the user details, and sets `SecurityContextHolder.getContext().setAuthentication(auth)`.

### 5.2 Role-Based Access Control
Lock down endpoints with intuitive annotations:
```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/admin/orders/{id}/pending")
public ResponseEntity<Void> deletePendingOrder(@PathVariable Long id) {
    orderService.deletePendingOrder(id);
    return ResponseEntity.noContent().build();
}
```

---

## Stage 6: REST API Design & Global Exception Handling

### 6.1 Clean HTTP Response Codes
- `200 OK`: Successful fetch / update.
- `201 Created`: New order or user registered.
- `204 No Content`: Successful delete.
- `400 Bad Request`: Validation error or duplicate purchase.
- `401 Unauthorized`: Missing or expired JWT token.
- `403 Forbidden`: Normal user trying to access admin studio.
- `404 Not Found`: Asset or template doesn't exist.

### 6.2 Global Exception Handler (`@ControllerAdvice`)
Catches any uncaught exceptions across all controllers and formats them into standardized JSON (RFC 7807):
```json
{
  "timestamp": "2026-09-19T09:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Asset with slug 'wap7-loco' does not exist",
  "path": "/api/v1/assets/wap7-loco"
}
```

---

## Stage 7: Next.js Frontend Integration

To connect your existing Next.js frontend to Spring Boot:
1. Update `NEXT_PUBLIC_API_URL` to point to `http://localhost:8080/api/v1` (or your cloud URL).
2. Use the provided `api-client.ts` in `learn-java/frontend-integration/` to automatically include the `Authorization: Bearer <token>` header.
3. Test every endpoint in real time using the built-in Swagger UI at `http://localhost:8080/swagger-ui.html`.

---

## Stage 8: Production Hosting & Cloud Deployment

See `04-HOSTING-AND-DEPLOYMENT-GUIDE.md` for full instructions covering:
- **Free Tier**: Deploy to Render + Neon PostgreSQL in 10 minutes.
- **Production VPS**: Docker Compose + PostgreSQL 16 + Nginx + Let's Encrypt SSL.
- **Continuous Deployment**: Automated GitHub Actions pipeline.

