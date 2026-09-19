package com.gjs.store.dto;

import com.gjs.store.entity.Asset;
import com.gjs.store.entity.Category;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class AssetDtos {

    public record CategoryDto(
        Long id,
        String name,
        String slug,
        String description,
        String icon,
        boolean isActive,
        int assetCount
    ) {
        public static CategoryDto fromEntity(Category c) {
            return new CategoryDto(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getDescription(),
                c.getIcon(),
                c.isActive(),
                c.getAssets() != null ? c.getAssets().size() : 0
            );
        }
    }

    public record AssetSummaryDto(
        Long id,
        String title,
        String slug,
        String categoryName,
        String categorySlug,
        String shortDescription,
        String simulatorType,
        String version,
        String fileSize,
        BigDecimal price,
        BigDecimal originalPrice,
        boolean isFree,
        boolean isFeatured,
        String thumbnailUrl,
        int downloadCount
    ) {
        public static AssetSummaryDto fromEntity(Asset a) {
            return new AssetSummaryDto(
                a.getId(),
                a.getTitle(),
                a.getSlug(),
                a.getCategory() != null ? a.getCategory().getName() : "",
                a.getCategory() != null ? a.getCategory().getSlug() : "",
                a.getShortDescription(),
                a.getSimulatorType(),
                a.getVersion(),
                a.getFileSize(),
                a.getPrice(),
                a.getOriginalPrice(),
                a.isFree(),
                a.isFeatured(),
                a.getThumbnailUrl(),
                a.getDownloadCount()
            );
        }
    }

    public record AssetDetailDto(
        Long id,
        String title,
        String slug,
        String categoryName,
        String categorySlug,
        String description,
        String shortDescription,
        String simulatorType,
        String version,
        String fileSize,
        BigDecimal price,
        BigDecimal originalPrice,
        boolean isFree,
        boolean isFeatured,
        String thumbnailUrl,
        String downloadUrl,
        int downloadCount,
        List<String> galleryImages,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        public static AssetDetailDto fromEntity(Asset a) {
            List<String> images = a.getImages() != null ?
                a.getImages().stream().map(img -> img.getImageUrl()).toList() :
                List.of();

            return new AssetDetailDto(
                a.getId(),
                a.getTitle(),
                a.getSlug(),
                a.getCategory() != null ? a.getCategory().getName() : "",
                a.getCategory() != null ? a.getCategory().getSlug() : "",
                a.getDescription(),
                a.getShortDescription(),
                a.getSimulatorType(),
                a.getVersion(),
                a.getFileSize(),
                a.getPrice(),
                a.getOriginalPrice(),
                a.isFree(),
                a.isFeatured(),
                a.getThumbnailUrl(),
                a.getDownloadUrl(),
                a.getDownloadCount(),
                images,
                a.getCreatedAt(),
                a.getUpdatedAt()
            );
        }
    }
}

