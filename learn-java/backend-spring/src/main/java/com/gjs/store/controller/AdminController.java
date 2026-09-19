package com.gjs.store.controller;

import com.gjs.store.dto.ApiResponse;
import com.gjs.store.dto.BoardDtos.BoardTemplateDto;
import com.gjs.store.dto.OrderDtos.OrderResponseDto;
import com.gjs.store.service.BoardTemplateService;
import com.gjs.store.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Operations", description = "Privileged administrator endpoints (orders, templates, presets)")
public class AdminController {

    private final OrderService orderService;
    private final BoardTemplateService boardService;

    public AdminController(OrderService orderService, BoardTemplateService boardService) {
        this.orderService = orderService;
        this.boardService = boardService;
    }

    @GetMapping("/orders")
    @Operation(summary = "Get all customer orders with pagination (Admin only)")
    public ResponseEntity<ApiResponse<Page<OrderResponseDto>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<OrderResponseDto> orders = orderService.getAllOrdersForAdmin(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @DeleteMapping("/orders/{id}/pending")
    @Operation(summary = "Delete an order if status is PENDING (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deletePendingOrder(@PathVariable Long id) {
        orderService.deletePendingOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Pending order #" + id + " deleted successfully", null));
    }

    @PutMapping("/board-templates/{id}/quick-presets")
    @Operation(summary = "Update Quick Presets (e.g. Tamil Nadu Exp) for a template (Admin only)")
    public ResponseEntity<ApiResponse<BoardTemplateDto>> updateQuickPresets(
            @PathVariable String id,
            @RequestBody String quickPresetsJson) {
        BoardTemplateDto updated = boardService.updateQuickPresets(id, quickPresetsJson);
        return ResponseEntity.ok(ApiResponse.success("Quick presets updated successfully", updated));
    }
}

