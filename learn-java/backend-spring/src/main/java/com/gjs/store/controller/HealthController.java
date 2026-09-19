package com.gjs.store.controller;

import com.gjs.store.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health & Status", description = "Application liveness and health diagnostics")
public class HealthController {

    @GetMapping
    @Operation(summary = "System health check")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> status = Map.of(
                "status", "UP",
                "service", "MSTS-GJS Production Store Spring Boot Backend",
                "framework", "Spring Boot 3.3.4",
                "javaVersion", System.getProperty("java.version"),
                "timestamp", LocalDateTime.now()
        );
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}

