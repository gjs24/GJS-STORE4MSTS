package com.gjs.store.controller;

import com.gjs.store.dto.ApiResponse;
import com.gjs.store.dto.AssetDtos.*;
import com.gjs.store.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@Tag(name = "Assets Catalog", description = "Train assets, locomotives, coaches, and search")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    @Operation(summary = "Get published train assets with optional filtering and pagination")
    public ResponseEntity<ApiResponse<Page<AssetSummaryDto>>> getAssets(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Page<AssetSummaryDto> assets = assetService.getPublishedAssets(category, search, PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.success(assets));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get complete asset details by slug")
    public ResponseEntity<ApiResponse<AssetDetailDto>> getAssetBySlug(@PathVariable String slug) {
        AssetDetailDto asset = assetService.getAssetBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(asset));
    }

    @GetMapping("/featured")
    @Operation(summary = "Get featured railway assets for homepage showcase")
    public ResponseEntity<ApiResponse<List<AssetSummaryDto>>> getFeaturedAssets() {
        List<AssetSummaryDto> featured = assetService.getFeaturedAssets();
        return ResponseEntity.ok(ApiResponse.success(featured));
    }
}

