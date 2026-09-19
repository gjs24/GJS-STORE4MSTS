package com.gjs.store.service;

import com.gjs.store.dto.OrderDtos.*;
import com.gjs.store.entity.*;
import com.gjs.store.exception.BadRequestException;
import com.gjs.store.exception.ResourceNotFoundException;
import com.gjs.store.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final AssetRepository assetRepository;
    private final BoardTemplateRepository templateRepository;
    private final UserBoardUnlockRepository unlockRepository;
    private final UserRepository userRepository;

    public OrderService(
            OrderRepository orderRepository,
            AssetRepository assetRepository,
            BoardTemplateRepository templateRepository,
            UserBoardUnlockRepository unlockRepository,
            UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.assetRepository = assetRepository;
        this.templateRepository = templateRepository;
        this.unlockRepository = unlockRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequest req, User user) {
        if (req.assetId() == null && (req.templateId() == null || req.templateId().isBlank())) {
            throw new BadRequestException("Either assetId or templateId must be provided");
        }

        // Save phone number to user profile if provided
        if (req.customerPhone() != null && !req.customerPhone().isBlank()) {
            if (user.getProfile() != null) {
                user.getProfile().setPhoneNumber(req.customerPhone().trim());
                userRepository.save(user);
            }
        }

        Asset asset = null;
        BoardTemplate template = null;
        BigDecimal amount = BigDecimal.ZERO;

        if (req.assetId() != null) {
            asset = assetRepository.findById(req.assetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Asset not found with ID: " + req.assetId()));

            // Prevent duplicate purchase if already paid
            if (orderRepository.existsByUserAndAssetAndStatus(user, asset, OrderStatus.PAID)) {
                throw new BadRequestException("You have already purchased this asset");
            }
            amount = asset.getPrice();
        } else {
            template = templateRepository.findById(req.templateId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template not found with ID: " + req.templateId()));

            // Check if already unlocked
            if (unlockRepository.existsByUserAndTemplate(user, template)) {
                throw new BadRequestException("You have already unlocked this template");
            }
            amount = template.getPrice();
        }

        boolean isFree = amount.compareTo(BigDecimal.ZERO) <= 0;
        String phone = req.customerPhone() != null ? req.customerPhone() : 
                      (user.getProfile() != null ? user.getProfile().getPhoneNumber() : "");

        Order order = Order.builder()
                .user(user)
                .asset(asset)
                .boardTemplate(template)
                .amount(amount)
                .currency("INR")
                .status(isFree ? OrderStatus.PAID : OrderStatus.PENDING)
                .customerPhone(phone)
                .downloadEnabled(isFree)
                .providerOrderId("CF_" + UUID.randomUUID().toString().substring(0, 16))
                .build();

        Order savedOrder = orderRepository.save(order);

        // If free template, unlock immediately
        if (isFree && template != null) {
            UserBoardUnlock unlock = UserBoardUnlock.builder()
                    .user(user)
                    .template(template)
                    .order(savedOrder)
                    .build();
            unlockRepository.save(unlock);
        }

        String paymentSessionId = isFree ? null : "session_" + UUID.randomUUID().toString().substring(0, 20);
        return OrderResponseDto.fromEntity(savedOrder, paymentSessionId);
    }

    @Transactional
    public OrderResponseDto verifyPayment(PaymentVerifyRequest req, User user) {
        Order order = orderRepository.findByOrderNumber(req.orderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with order number: " + req.orderNumber()));

        if (!order.getUser().getId().equals(user.getId()) && !user.getRole().name().equals("ROLE_ADMIN")) {
            throw new BadRequestException("You do not have permission to verify this order");
        }

        if (order.getStatus() == OrderStatus.PAID) {
            return OrderResponseDto.fromEntity(order);
        }

        // Mark as PAID
        order.setStatus(OrderStatus.PAID);
        order.setDownloadEnabled(true);
        order.setPaymentSubmittedAt(LocalDateTime.now());
        if (req.providerPaymentId() != null) {
            order.setUtr(req.providerPaymentId());
        }

        Order savedOrder = orderRepository.save(order);

        // If board template, unlock for user
        if (savedOrder.getBoardTemplate() != null) {
            if (!unlockRepository.existsByUserAndTemplate(user, savedOrder.getBoardTemplate())) {
                UserBoardUnlock unlock = UserBoardUnlock.builder()
                        .user(user)
                        .template(savedOrder.getBoardTemplate())
                        .order(savedOrder)
                        .build();
                unlockRepository.save(unlock);
            }
        }

        return OrderResponseDto.fromEntity(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDto> getUserPurchases(User user) {
        return orderRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .map(OrderResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<OrderResponseDto> getAllOrdersForAdmin(Pageable pageable) {
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(OrderResponseDto::fromEntity);
    }

    /**
     * Admin operation: Delete an order if it is in PENDING status.
     * Paid or approved orders cannot be deleted to preserve financial audit trail.
     */
    @Transactional
    public void deletePendingOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Cannot delete order #" + orderId + ". Only PENDING orders can be deleted (Current status: " + order.getStatus() + ")");
        }

        orderRepository.delete(order);
    }
}

