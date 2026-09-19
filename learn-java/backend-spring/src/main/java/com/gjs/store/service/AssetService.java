package com.gjs.store.service;

import com.gjs.store.dto.AssetDtos.*;
import com.gjs.store.entity.Asset;
import com.gjs.store.entity.Category;
import com.gjs.store.exception.ResourceNotFoundException;
import com.gjs.store.repository.AssetRepository;
import com.gjs.store.repository.CategoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AssetService {

    private final AssetRepository assetRepository;
    private final CategoryRepository categoryRepository;

    public AssetService(AssetRepository assetRepository, CategoryRepository categoryRepository) {
        this.assetRepository = assetRepository;
        this.categoryRepository = categoryRepository;
    }

    public Page<AssetSummaryDto> getPublishedAssets(String categorySlug, String search, Pageable pageable) {
        Page<Asset> assets;

        if (search != null && !search.isBlank()) {
            if (categorySlug != null && !categorySlug.isBlank()) {
                assets = assetRepository.searchAssetsByCategory(categorySlug, search.trim(), pageable);
            } else {
                assets = assetRepository.searchAssets(search.trim(), pageable);
            }
        } else if (categorySlug != null && !categorySlug.isBlank()) {
            assets = assetRepository.findByCategorySlugAndIsPublishedTrue(categorySlug, pageable);
        } else {
            assets = assetRepository.findByIsPublishedTrue(pageable);
        }

        return assets.map(AssetSummaryDto::fromEntity);
    }

    public AssetDetailDto getAssetBySlug(String slug) {
        Asset asset = assetRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with slug: " + slug));
        return AssetDetailDto.fromEntity(asset);
    }

    public List<AssetSummaryDto> getFeaturedAssets() {
        return assetRepository.findByIsFeaturedTrueAndIsPublishedTrue().stream()
                .map(AssetSummaryDto::fromEntity)
                .toList();
    }

    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(CategoryDto::fromEntity)
                .toList();
    }

    public CategoryDto getCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with slug: " + slug));
        return CategoryDto.fromEntity(category);
    }
}

