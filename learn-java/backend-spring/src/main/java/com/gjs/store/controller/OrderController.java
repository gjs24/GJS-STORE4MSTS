package com.gjs.store.controller;

import com.gjs.store.dto.ApiResponse;
import com.gjs.store.dto.OrderDtos.*;
import com.gjs.store.entity.User;
import com.gjs.store.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Orders & Payments", description = "Order creation, Cashfree verification, and user purchases")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/create")
    @Operation(summary = "Create an order for an asset or board template")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal User user) {
        OrderResponseDto order = orderService.createOrder(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order initiated successfully", order));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Cashfree or UPI payment and unlock downloads")
    public ResponseEntity<ApiResponse<OrderResponseDto>> verifyPayment(
            @Valid @RequestBody PaymentVerifyRequest request,
            @AuthenticationPrincipal User user) {
        OrderResponseDto order = orderService.verifyPayment(request, user);
        return ResponseEntity.ok(ApiResponse.success("Payment verified and download unlocked!", order));
    }

    @GetMapping("/my-purchases")
    @Operation(summary = "Get list of completed purchases and unlocked addons for current user")
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getMyPurchases(@AuthenticationPrincipal User user) {
        List<OrderResponseDto> purchases = orderService.getUserPurchases(user);
        return ResponseEntity.ok(ApiResponse.success(purchases));
    }
}

