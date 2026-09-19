package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_user_status", columnList = "user_id, status"),
    @Index(name = "idx_orders_provider_order", columnList = "provider_order_id")
})
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_template_id")
    private BoardTemplate boardTemplate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "provider_order_id", length = 160)
    private String providerOrderId;

    @Column(length = 80)
    private String utr;

    @Column(name = "payer_name", length = 160)
    private String payerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "payment_submitted_at")
    private LocalDateTime paymentSubmittedAt;

    @Column(name = "download_enabled", nullable = false)
    private boolean downloadEnabled = false;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Order() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String orderNumber;
        private User user;
        private Asset asset;
        private BoardTemplate boardTemplate;
        private BigDecimal amount;
        private String currency = "INR";
        private OrderStatus status = OrderStatus.PENDING;
        private String providerOrderId;
        private String utr;
        private String payerName;
        private String customerPhone;
        private LocalDateTime paymentSubmittedAt;
        private boolean downloadEnabled = false;
        private String adminNotes;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder orderNumber(String orderNumber) { this.orderNumber = orderNumber; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder asset(Asset asset) { this.asset = asset; return this; }
        public Builder boardTemplate(BoardTemplate boardTemplate) { this.boardTemplate = boardTemplate; return this; }
        public Builder amount(BigDecimal amount) { this.amount = amount; return this; }
        public Builder currency(String currency) { this.currency = currency; return this; }
        public Builder status(OrderStatus status) { this.status = status; return this; }
        public Builder providerOrderId(String providerOrderId) { this.providerOrderId = providerOrderId; return this; }
        public Builder utr(String utr) { this.utr = utr; return this; }
        public Builder payerName(String payerName) { this.payerName = payerName; return this; }
        public Builder customerPhone(String customerPhone) { this.customerPhone = customerPhone; return this; }
        public Builder paymentSubmittedAt(LocalDateTime paymentSubmittedAt) { this.paymentSubmittedAt = paymentSubmittedAt; return this; }
        public Builder downloadEnabled(boolean downloadEnabled) { this.downloadEnabled = downloadEnabled; return this; }
        public Builder adminNotes(String adminNotes) { this.adminNotes = adminNotes; return this; }

        public Order build() {
            Order o = new Order();
            o.id = this.id;
            o.orderNumber = this.orderNumber;
            o.user = this.user;
            o.asset = this.asset;
            o.boardTemplate = this.boardTemplate;
            o.amount = this.amount;
            o.currency = this.currency;
            o.status = this.status != null ? this.status : OrderStatus.PENDING;
            o.providerOrderId = this.providerOrderId;
            o.utr = this.utr;
            o.payerName = this.payerName;
            o.customerPhone = this.customerPhone;
            o.paymentSubmittedAt = this.paymentSubmittedAt;
            o.downloadEnabled = this.downloadEnabled;
            o.adminNotes = this.adminNotes;
            return o;
        }
    }

    @PrePersist
    public void generateOrderNumber() {
        if (this.orderNumber == null || this.orderNumber.isBlank()) {
            this.orderNumber = "GJS-" + System.currentTimeMillis();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Asset getAsset() { return asset; }
    public void setAsset(Asset asset) { this.asset = asset; }

    public BoardTemplate getBoardTemplate() { return boardTemplate; }
    public void setBoardTemplate(BoardTemplate boardTemplate) { this.boardTemplate = boardTemplate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public String getProviderOrderId() { return providerOrderId; }
    public void setProviderOrderId(String providerOrderId) { this.providerOrderId = providerOrderId; }

    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public LocalDateTime getPaymentSubmittedAt() { return paymentSubmittedAt; }
    public void setPaymentSubmittedAt(LocalDateTime paymentSubmittedAt) { this.paymentSubmittedAt = paymentSubmittedAt; }

    public boolean isDownloadEnabled() { return downloadEnabled; }
    public void setDownloadEnabled(boolean downloadEnabled) { this.downloadEnabled = downloadEnabled; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
