package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_templates")
public class BoardTemplate {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(length = 80)
    private String category = "LED_MATRIX";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "base_width")
    private int baseWidth = 1024;

    @Column(name = "base_height")
    private int baseHeight = 256;

    @Column(name = "bg_image_url", columnDefinition = "TEXT")
    private String bgImageUrl;

    @Column(name = "target_texture_name", length = 120)
    private String targetTextureName;

    @Column(name = "is_paid", nullable = false)
    private boolean isPaid = false;

    @Column(precision = 10, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean published = true;

    @Column(name = "fields", columnDefinition = "TEXT")
    private String fields; // JSON string

    @Column(name = "quick_presets", columnDefinition = "TEXT")
    private String quickPresets; // JSON string

    @Column(name = "variations", columnDefinition = "TEXT")
    private String variations; // JSON string

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public BoardTemplate() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String name;
        private String category = "LED_MATRIX";
        private String description;
        private int baseWidth = 1024;
        private int baseHeight = 256;
        private String bgImageUrl;
        private String targetTextureName;
        private boolean isPaid = false;
        private BigDecimal price = BigDecimal.ZERO;
        private boolean published = true;
        private String fields;
        private String quickPresets;
        private String variations;

        public Builder id(String id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder category(String category) { this.category = category; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder baseWidth(int baseWidth) { this.baseWidth = baseWidth; return this; }
        public Builder baseHeight(int baseHeight) { this.baseHeight = baseHeight; return this; }
        public Builder bgImageUrl(String bgImageUrl) { this.bgImageUrl = bgImageUrl; return this; }
        public Builder targetTextureName(String targetTextureName) { this.targetTextureName = targetTextureName; return this; }
        public Builder isPaid(boolean isPaid) { this.isPaid = isPaid; return this; }
        public Builder price(BigDecimal price) { this.price = price; return this; }
        public Builder published(boolean published) { this.published = published; return this; }
        public Builder fields(String fields) { this.fields = fields; return this; }
        public Builder quickPresets(String quickPresets) { this.quickPresets = quickPresets; return this; }
        public Builder variations(String variations) { this.variations = variations; return this; }

        public BoardTemplate build() {
            BoardTemplate t = new BoardTemplate();
            t.id = this.id;
            t.name = this.name;
            t.category = this.category;
            t.description = this.description;
            t.baseWidth = this.baseWidth;
            t.baseHeight = this.baseHeight;
            t.bgImageUrl = this.bgImageUrl;
            t.targetTextureName = this.targetTextureName;
            t.isPaid = this.isPaid;
            t.price = this.price;
            t.published = this.published;
            t.fields = this.fields;
            t.quickPresets = this.quickPresets;
            t.variations = this.variations;
            return t;
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getBaseWidth() { return baseWidth; }
    public void setBaseWidth(int baseWidth) { this.baseWidth = baseWidth; }

    public int getBaseHeight() { return baseHeight; }
    public void setBaseHeight(int baseHeight) { this.baseHeight = baseHeight; }

    public String getBgImageUrl() { return bgImageUrl; }
    public void setBgImageUrl(String bgImageUrl) { this.bgImageUrl = bgImageUrl; }

    public String getTargetTextureName() { return targetTextureName; }
    public void setTargetTextureName(String targetTextureName) { this.targetTextureName = targetTextureName; }

    public boolean isPaid() { return isPaid; }
    public void setPaid(boolean paid) { isPaid = paid; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }

    public String getFields() { return fields; }
    public void setFields(String fields) { this.fields = fields; }

    public String getQuickPresets() { return quickPresets; }
    public void setQuickPresets(String quickPresets) { this.quickPresets = quickPresets; }

    public String getVariations() { return variations; }
    public void setVariations(String variations) { this.variations = variations; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
