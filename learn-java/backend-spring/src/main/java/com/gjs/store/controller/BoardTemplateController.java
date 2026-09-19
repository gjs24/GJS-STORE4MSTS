package com.gjs.store.controller;

import com.gjs.store.dto.ApiResponse;
import com.gjs.store.dto.BoardDtos.*;
import com.gjs.store.entity.User;
import com.gjs.store.entity.UserCustomBoard;
import com.gjs.store.service.BoardTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/board-templates")
@Tag(name = "Railway Board Studio", description = "LED matrix templates, Quick Presets, and custom board saves")
public class BoardTemplateController {

    private final BoardTemplateService boardService;

    public BoardTemplateController(BoardTemplateService boardService) {
        this.boardService = boardService;
    }

    @GetMapping
    @Operation(summary = "Get all available board templates with user unlock status")
    public ResponseEntity<ApiResponse<List<BoardTemplateDto>>> getTemplates(@AuthenticationPrincipal User user) {
        List<BoardTemplateDto> templates = boardService.getAllTemplates(user);
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get specific board template details and Quick Presets by ID")
    public ResponseEntity<ApiResponse<BoardTemplateDto>> getTemplateById(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        BoardTemplateDto template = boardService.getTemplateById(id, user);
        return ResponseEntity.ok(ApiResponse.success(template));
    }

    @PostMapping("/custom-board")
    @Operation(summary = "Save user's custom board design with LED text slot values")
    public ResponseEntity<ApiResponse<Long>> saveCustomBoard(
            @RequestBody SaveCustomBoardRequest request,
            @AuthenticationPrincipal User user) {
        Long customBoardId = boardService.saveUserCustomBoard(request, user);
        return ResponseEntity.ok(ApiResponse.success("Custom board saved successfully", customBoardId));
    }

    @GetMapping("/my-custom-boards")
    @Operation(summary = "List all custom boards designed by the current user")
    public ResponseEntity<ApiResponse<List<UserCustomBoard>>> getMyCustomBoards(@AuthenticationPrincipal User user) {
        List<UserCustomBoard> boards = boardService.getUserCustomBoards(user);
        return ResponseEntity.ok(ApiResponse.success(boards));
    }
}

