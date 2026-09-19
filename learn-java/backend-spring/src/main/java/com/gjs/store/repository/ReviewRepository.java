package com.gjs.store.repository;

import com.gjs.store.entity.Asset;
import com.gjs.store.entity.Review;
import com.gjs.store.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByAssetAndIsApprovedTrueOrderByCreatedAtDesc(Asset asset);

    boolean existsByUserAndAsset(User user, Asset asset);
}

