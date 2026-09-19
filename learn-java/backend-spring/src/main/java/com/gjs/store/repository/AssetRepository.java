package com.gjs.store.repository;

import com.gjs.store.entity.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    Optional<Asset> findBySlug(String slug);

    Page<Asset> findByIsPublishedTrue(Pageable pageable);

    Page<Asset> findByCategorySlugAndIsPublishedTrue(String categorySlug, Pageable pageable);

    List<Asset> findByIsFeaturedTrueAndIsPublishedTrue();

    @Query("SELECT a FROM Asset a WHERE a.isPublished = true AND (" +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.shortDescription) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Asset> searchAssets(@Param("query") String query, Pageable pageable);

    @Query("SELECT a FROM Asset a WHERE a.isPublished = true AND a.category.slug = :categorySlug AND (" +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.shortDescription) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Asset> searchAssetsByCategory(@Param("categorySlug") String categorySlug, @Param("query") String query, Pageable pageable);
}

