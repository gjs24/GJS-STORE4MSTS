package com.gjs.store.dto;

import com.gjs.store.entity.Order;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class OrderDtos {

    public record CreateOrderRequest(
        Long assetId,
        String templateId,

        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be a valid 10-digit mobile number")
        String customerPhone
    ) {}

    public record OrderResponseDto(
        Long id,
        String orderNumber,
        Long assetId,
        String assetTitle,
        String templateId,
        String templateName,
        BigDecimal amount,
        String currency,
        String status,
        String customerPhone,
        boolean downloadEnabled,
        String providerOrderId,
        String paymentSessionId,
        LocalDateTime createdAt
    ) {
        public static OrderResponseDto fromEntity(Order o, String paymentSessionId) {
            String assetTitle = o.getAsset() != null ? o.getAsset().getTitle() : null;
            Long assetId = o.getAsset() != null ? o.getAsset().getId() : null;
            String templateName = o.getBoardTemplate() != null ? o.getBoardTemplate().getName() : null;
            String templateId = o.getBoardTemplate() != null ? o.getBoardTemplate().getId() : null;

            return new OrderResponseDto(
                o.getId(),
                o.getOrderNumber(),
                assetId,
                assetTitle,
                templateId,
                templateName,
                o.getAmount(),
                o.getCurrency(),
                o.getStatus().name(),
                o.getCustomerPhone(),
                o.isDownloadEnabled(),
                o.getProviderOrderId(),
                paymentSessionId,
                o.getCreatedAt()
            );
        }

        public static OrderResponseDto fromEntity(Order o) {
            return fromEntity(o, null);
        }
    }

    public record PaymentVerifyRequest(
        String orderNumber,
        String providerOrderId,
        String providerPaymentId,
        String providerSignature
    ) {}
}

