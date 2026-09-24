package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_custom_boards")
public class UserCustomBoard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private BoardTemplate template;

    @Column(nullable = false, length = 180)
    private String title = "My Custom Board";

    @Column(name = "custom_field_values", columnDefinition = "TEXT")
    private String customFieldValues;

    @Column(name = "preview_image_url", columnDefinition = "TEXT")
    private String previewImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;

    public UserCustomBoard() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private User user;
        private BoardTemplate template;
        private String title = "My Custom Board";
        private String customFieldValues;
        private String previewImageUrl;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder template(BoardTemplate template) { this.template = template; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder customFieldValues(String customFieldValues) { this.customFieldValues = customFieldValues; return this; }
        public Builder previewImageUrl(String previewImageUrl) { this.previewImageUrl = previewImageUrl; return this; }

        public UserCustomBoard build() {
            UserCustomBoard b = new UserCustomBoard();
            b.id = this.id;
            b.user = this.user;
            b.template = this.template;
            b.title = this.title;
            b.customFieldValues = this.customFieldValues;
            b.previewImageUrl = this.previewImageUrl;
            return b;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public BoardTemplate getTemplate() { return template; }
    public void setTemplate(BoardTemplate template) { this.template = template; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCustomFieldValues() { return customFieldValues; }
    public void setCustomFieldValues(String customFieldValues) { this.customFieldValues = customFieldValues; }

    public String getPreviewImageUrl() { return previewImageUrl; }
    public void setPreviewImageUrl(String previewImageUrl) { this.previewImageUrl = previewImageUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getSavedAt() { return savedAt; }
    public void setSavedAt(LocalDateTime savedAt) { this.savedAt = savedAt; }
}

