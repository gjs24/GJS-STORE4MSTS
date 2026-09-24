package com.gjs.store.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_asset_review", columnNames = {"user_id", "asset_id"})
})
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Min(1)
    @Max(5)
    @Column(nullable = false)
    private int rating;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Column(name = "is_approved", nullable = false)
    private boolean isApproved = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Review() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private User user;
        private Asset asset;
        private int rating = 5;
        private String comment;
        private boolean isApproved = true;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder asset(Asset asset) { this.asset = asset; return this; }
        public Builder rating(int rating) { this.rating = rating; return this; }
        public Builder comment(String comment) { this.comment = comment; return this; }
        public Builder isApproved(boolean isApproved) { this.isApproved = isApproved; return this; }

        public Review build() {
            Review r = new Review();
            r.id = this.id;
            r.user = this.user;
            r.asset = this.asset;
            r.rating = this.rating;
            r.comment = this.comment;
            r.isApproved = this.isApproved;
            return r;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Asset getAsset() { return asset; }
    public void setAsset(Asset asset) { this.asset = asset; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public boolean isApproved() { return isApproved; }
    public void setApproved(boolean approved) { isApproved = approved; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

