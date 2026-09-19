package com.gjs.store.repository;

import com.gjs.store.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findTopByEmailAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(String email, String purpose);
}

