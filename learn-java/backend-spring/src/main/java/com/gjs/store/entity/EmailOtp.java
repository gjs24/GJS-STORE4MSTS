package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_otps", indexes = {
    @Index(name = "idx_otp_email_purpose", columnList = "email, purpose, is_used")
})
public class EmailOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(nullable = false, length = 30)
    private String purpose = "LOGIN"; // LOGIN, SIGNUP, RESET

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "is_used", nullable = false)
    private boolean isUsed = false;

    @Column(nullable = false)
    private int attempts = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public EmailOtp() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String email;
        private String otpCode;
        private String purpose = "LOGIN";
        private LocalDateTime expiresAt;
        private boolean isUsed = false;
        private int attempts = 0;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder otpCode(String otpCode) { this.otpCode = otpCode; return this; }
        public Builder purpose(String purpose) { this.purpose = purpose; return this; }
        public Builder expiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; return this; }
        public Builder isUsed(boolean isUsed) { this.isUsed = isUsed; return this; }
        public Builder attempts(int attempts) { this.attempts = attempts; return this; }

        public EmailOtp build() {
            EmailOtp o = new EmailOtp();
            o.id = this.id;
            o.email = this.email;
            o.otpCode = this.otpCode;
            o.purpose = this.purpose;
            o.expiresAt = this.expiresAt;
            o.isUsed = this.isUsed;
            o.attempts = this.attempts;
            return o;
        }
    }

    public boolean isValid() {
        return !isUsed && attempts < 5 && LocalDateTime.now().isBefore(expiresAt);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isUsed() { return isUsed; }
    public void setUsed(boolean used) { isUsed = used; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

