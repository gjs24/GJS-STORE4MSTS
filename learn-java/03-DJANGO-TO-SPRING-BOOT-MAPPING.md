# 🔄 Django to Spring Boot 3: Complete Side-by-Side Mapping

This reference maps every single component of your existing Python/Django MSTS store to its equivalent in Java Spring Boot 3.

---

## 1. Project Structure Comparison

| Python / Django MSTS Store | Java / Spring Boot 3 (`learn-java/backend-spring`) | Description |
|---|---|---|
| `manage.py` | `mvnw` / `mvnw.cmd` | Command-line management & build tool runner |
| `backend/core/settings.py` | `src/main/resources/application.yml` | Central configuration, database, JWT, secrets |
| `backend/store/models.py` | `src/main/java/com/gjs/store/entity/` | Database tables & relations |
| `backend/store/serializers.py` | `src/main/java/com/gjs/store/dto/` | Request/response DTOs & validation |
| `backend/store/views.py` | `com/gjs/store/controller/` + `service/` | Controllers (HTTP routing) + Services (Business rules) |
| `backend/store/urls.py` | `@RequestMapping`, `@GetMapping`, `@PostMapping` | REST routing annotations on controllers |
| `backend/store/admin.py` | Swagger UI (`/swagger-ui.html`) + AdminController | Administrative dashboard APIs |
| `requirements.txt` | `pom.xml` | Dependency declarations and versions |
| `migrations/*.py` | Flyway SQL migrations / Hibernate DDL | Database schema versioning |

---

## 2. Models to JPA Entities

### Example 1: `Category` Model

#### Python / Django (`models.py`)
```python
class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
```

#### Java / Spring Boot 3 (`Category.java`)
```java
@Entity
@Table(name = "categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 140)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 80)
    private String icon;

    @Column(nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Asset> assets = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void generateSlug() {
        if (this.slug == null || this.slug.isBlank()) {
            this.slug = this.name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        }
    }
}
```

---

### Example 2: `Order` Model & Status Choices

#### Python / Django (`models.py`)
```python
class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    customer_phone = models.CharField(max_length=20, blank=True)
    download_enabled = models.BooleanField(default=False)
```

#### Java / Spring Boot 3 (`Order.java` & `OrderStatus.java`)
```java
public enum OrderStatus {
    PENDING,
    VERIFICATION_PENDING,
    APPROVED,
    REJECTED,
    PAID,
    FAILED,
    EXPIRED,
    REFUNDED,
    BLOCKED
}

@Entity
@Table(name = "orders", uniqueConstraints = {
    @UniqueConstraint(name = "one_paid_order_per_user_asset", columnNames = {"user_id", "asset_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", unique = true, length = 64)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(nullable = false)
    @Builder.Default
    private boolean downloadEnabled = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

---

## 3. Serializers to DTOs & Validation

#### Python / Django (`serializers.py`)
```python
class CreateOrderSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField(required=False)
    template_id = serializers.CharField(required=False)
    customer_phone = serializers.CharField(max_length=20, required=True)

    def validate_customer_phone(self, value):
        cleaned = re.sub(r"[^\d]", "", value)
        if len(cleaned) < 10:
            raise serializers.ValidationError("Valid 10-digit mobile required.")
        return cleaned[-10:]
```

#### Java 21 Record DTO with Bean Validation (`CreateOrderRequest.java`)
```java
public record CreateOrderRequest(
    Long assetId,
    String templateId,

    @NotBlank(message = "Customer phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be a valid 10-digit mobile number")
    String customerPhone
) {}
```

---

## 4. Querying Data: Django ORM vs Spring Data JPA

| Task | Django ORM | Spring Data JPA |
|---|---|---|
| Find by ID | `Asset.objects.get(id=id)` | `assetRepository.findById(id).orElseThrow(...)` |
| Filter by published | `Asset.objects.filter(is_published=True)` | `assetRepository.findByIsPublishedTrue()` |
| Search by keyword | `Asset.objects.filter(title__icontains=q)` | `assetRepository.findByTitleContainingIgnoreCase(q)` |
| Check existence | `Order.objects.filter(user=u, status='PAID').exists()` | `orderRepository.existsByUserAndStatus(u, OrderStatus.PAID)` |
| Delete pending orders | `Order.objects.filter(id=id, status='PENDING').delete()` | `orderRepository.deleteByIdAndStatus(id, OrderStatus.PENDING)` |
| Pagination | `Paginator(queryset, page_size)` | `assetRepository.findAll(PageRequest.of(page, size))` |

---

## 5. Endpoints: Django Views vs Spring REST Controllers

#### Python / Django ViewSet (`views.py`)
```python
class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssetSerializer

    def get_queryset(self):
        qs = Asset.objects.filter(is_published=True)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        return qs
```

#### Java / Spring Boot 3 Controller (`AssetController.java`)
```java
@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {
    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    public ResponseEntity<Page<AssetSummaryDto>> getAssets(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<AssetSummaryDto> results = assetService.getPublishedAssets(category, search, PageRequest.of(page, size));
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<AssetDetailDto> getAssetBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(assetService.getAssetBySlug(slug));
    }
}
```

---

## 6. Authentication: Django SimpleJWT vs Spring Security 6

In Django:
- Settings define `REST_FRAMEWORK` with `rest_framework_simplejwt.authentication.JWTAuthentication`.
- Views use `permission_classes = [IsAuthenticated]`.

In Spring Boot 3:
- Security is configured using the `SecurityFilterChain` bean:
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/api/v1/assets/**",
                    "/api/v1/categories/**",
                    "/api/v1/board-templates/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/h2-console/**"
                ).permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

Every concept in your existing codebase has a direct, elegant, and highly performant counterpart in Java Spring Boot.

