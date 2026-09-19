package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assets")
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "short_description", length = 260)
    private String shortDescription;

    @Column(name = "simulator_type", length = 20)
    private String simulatorType = "BOTH"; // MSTS, OPEN_RAILS, BOTH

    @Column(length = 40)
    private String version = "1.0.0";

    @Column(name = "file_size", length = 40)
    private String fileSize;

    @Column(precision = 10, scale = 2)
    private BigDecimal originalPrice = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "is_free", nullable = false)
    private boolean isFree = true;

    @Column(name = "is_published", nullable = false)
    private boolean isPublished = true;

    @Column(name = "is_featured", nullable = false)
    private boolean isFeatured = false;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    @Column(name = "download_url", columnDefinition = "TEXT")
    private String downloadUrl;

    @Column(name = "download_count")
    private int downloadCount = 0;

    @OneToMany(mappedBy = "asset", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<AssetImage> images = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Asset() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String title;
        private String slug;
        private Category category;
        private String description;
        private String shortDescription;
        private String simulatorType = "BOTH";
        private String version = "1.0.0";
        private String fileSize;
        private BigDecimal originalPrice = BigDecimal.ZERO;
        private BigDecimal price = BigDecimal.ZERO;
        private boolean isFree = true;
        private boolean isPublished = true;
        private boolean isFeatured = false;
        private String thumbnailUrl;
        private String downloadUrl;
        private int downloadCount = 0;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder slug(String slug) { this.slug = slug; return this; }
        public Builder category(Category category) { this.category = category; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder shortDescription(String shortDescription) { this.shortDescription = shortDescription; return this; }
        public Builder simulatorType(String simulatorType) { this.simulatorType = simulatorType; return this; }
        public Builder version(String version) { this.version = version; return this; }
        public Builder fileSize(String fileSize) { this.fileSize = fileSize; return this; }
        public Builder originalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; return this; }
        public Builder price(BigDecimal price) { this.price = price; return this; }
        public Builder isFree(boolean isFree) { this.isFree = isFree; return this; }
        public Builder isPublished(boolean isPublished) { this.isPublished = isPublished; return this; }
        public Builder isFeatured(boolean isFeatured) { this.isFeatured = isFeatured; return this; }
        public Builder thumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; return this; }
        public Builder downloadUrl(String downloadUrl) { this.downloadUrl = downloadUrl; return this; }
        public Builder downloadCount(int downloadCount) { this.downloadCount = downloadCount; return this; }

        public Asset build() {
            Asset a = new Asset();
            a.id = this.id;
            a.title = this.title;
            a.slug = this.slug;
            a.category = this.category;
            a.description = this.description;
            a.shortDescription = this.shortDescription;
            a.simulatorType = this.simulatorType;
            a.version = this.version;
            a.fileSize = this.fileSize;
            a.originalPrice = this.originalPrice;
            a.price = this.price;
            a.isFree = this.isFree;
            a.isPublished = this.isPublished;
            a.isFeatured = this.isFeatured;
            a.thumbnailUrl = this.thumbnailUrl;
            a.downloadUrl = this.downloadUrl;
            a.downloadCount = this.downloadCount;
            return a;
        }
    }

    @PrePersist
    @PreUpdate
    public void validateState() {
        if (this.slug == null || this.slug.isBlank()) {
            this.slug = this.title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        }
        this.isFree = this.price == null || this.price.compareTo(BigDecimal.ZERO) <= 0;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getSimulatorType() { return simulatorType; }
    public void setSimulatorType(String simulatorType) { this.simulatorType = simulatorType; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public BigDecimal getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public boolean isFree() { return isFree; }
    public void setFree(boolean free) { isFree = free; }

    public boolean isPublished() { return isPublished; }
    public void setPublished(boolean published) { isPublished = published; }

    public boolean isFeatured() { return isFeatured; }
    public void setFeatured(boolean featured) { isFeatured = featured; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getDownloadUrl() { return downloadUrl; }
    public void setDownloadUrl(String downloadUrl) { this.downloadUrl = downloadUrl; }

    public int getDownloadCount() { return downloadCount; }
    public void setDownloadCount(int downloadCount) { this.downloadCount = downloadCount; }

    public List<AssetImage> getImages() { return images; }
    public void setImages(List<AssetImage> images) { this.images = images; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
