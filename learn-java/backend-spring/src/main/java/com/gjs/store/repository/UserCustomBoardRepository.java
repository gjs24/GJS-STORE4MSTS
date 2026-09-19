package com.gjs.store.repository;

import com.gjs.store.entity.User;
import com.gjs.store.entity.UserCustomBoard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserCustomBoardRepository extends JpaRepository<UserCustomBoard, Long> {

    List<UserCustomBoard> findByUserOrderBySavedAtDesc(User user);
}

