package com.gjs.store.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "asset_images")
public class AssetImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "alt_text", length = 180)
    private String altText;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    public AssetImage() {}

    public AssetImage(Long id, Asset asset, String imageUrl, String altText, int sortOrder) {
        this.id = id;
        this.asset = asset;
        this.imageUrl = imageUrl;
        this.altText = altText;
        this.sortOrder = sortOrder;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Asset asset;
        private String imageUrl;
        private String altText;
        private int sortOrder = 0;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder asset(Asset asset) { this.asset = asset; return this; }
        public Builder imageUrl(String imageUrl) { this.imageUrl = imageUrl; return this; }
        public Builder altText(String altText) { this.altText = altText; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }
        public AssetImage build() { return new AssetImage(id, asset, imageUrl, altText, sortOrder); }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Asset getAsset() { return asset; }
    public void setAsset(Asset asset) { this.asset = asset; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getAltText() { return altText; }
    public void setAltText(String altText) { this.altText = altText; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
