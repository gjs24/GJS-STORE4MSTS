package com.gjs.store.repository;

import com.gjs.store.entity.Asset;
import com.gjs.store.entity.BoardTemplate;
import com.gjs.store.entity.Order;
import com.gjs.store.entity.OrderStatus;
import com.gjs.store.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByProviderOrderId(String providerOrderId);

    List<Order> findByUserOrderByCreatedAtDesc(User user);

    Page<Order> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Order> findByStatus(OrderStatus status);

    boolean existsByUserAndAssetAndStatus(User user, Asset asset, OrderStatus status);

    boolean existsByUserAndBoardTemplateAndStatus(User user, BoardTemplate template, OrderStatus status);

    @Modifying
    @Query("DELETE FROM Order o WHERE o.id = :id AND o.status = :status")
    int deleteByIdAndStatus(@Param("id") Long id, @Param("status") OrderStatus status);
}

