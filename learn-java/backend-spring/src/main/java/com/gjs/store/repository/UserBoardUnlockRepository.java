package com.gjs.store.repository;

import com.gjs.store.entity.BoardTemplate;
import com.gjs.store.entity.User;
import com.gjs.store.entity.UserBoardUnlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBoardUnlockRepository extends JpaRepository<UserBoardUnlock, Long> {

    boolean existsByUserAndTemplate(User user, BoardTemplate template);

    List<UserBoardUnlock> findByUserOrderByUnlockedAtDesc(User user);

    Optional<UserBoardUnlock> findByUserAndTemplate(User user, BoardTemplate template);
}

