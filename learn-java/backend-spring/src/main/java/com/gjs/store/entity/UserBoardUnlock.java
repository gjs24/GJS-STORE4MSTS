package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_board_unlocks", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_board_template", columnNames = {"user_id", "template_id"})
})
public class UserBoardUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private BoardTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @CreationTimestamp
    @Column(name = "unlocked_at", nullable = false, updatable = false)
    private LocalDateTime unlockedAt;

    public UserBoardUnlock() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private User user;
        private BoardTemplate template;
        private Order order;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder template(BoardTemplate template) { this.template = template; return this; }
        public Builder order(Order order) { this.order = order; return this; }

        public UserBoardUnlock build() {
            UserBoardUnlock u = new UserBoardUnlock();
            u.id = this.id;
            u.user = this.user;
            u.template = this.template;
            u.order = this.order;
            return u;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public BoardTemplate getTemplate() { return template; }
    public void setTemplate(BoardTemplate template) { this.template = template; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }
}
