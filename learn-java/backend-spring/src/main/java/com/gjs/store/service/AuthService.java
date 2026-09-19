package com.gjs.store.service;

import com.gjs.store.dto.AuthDtos.*;
import com.gjs.store.entity.EmailOtp;
import com.gjs.store.entity.Role;
import com.gjs.store.entity.User;
import com.gjs.store.entity.UserProfile;
import com.gjs.store.exception.BadRequestException;
import com.gjs.store.exception.ResourceNotFoundException;
import com.gjs.store.repository.EmailOtpRepository;
import com.gjs.store.repository.UserRepository;
import com.gjs.store.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmailOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            EmailOtpRepository otpRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            throw new BadRequestException("Username '" + req.username() + "' is already taken");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new BadRequestException("Email '" + req.email() + "' is already registered");
        }

        User user = User.builder()
                .username(req.username().trim().toLowerCase())
                .email(req.email().trim().toLowerCase())
                .password(passwordEncoder.encode(req.password()))
                .role(Role.ROLE_USER)
                .isActive(true)
                .build();

        UserProfile profile = UserProfile.builder()
                .user(user)
                .phoneNumber(req.phoneNumber() != null ? req.phoneNumber().trim() : "")
                .build();
        user.setProfile(profile);

        User savedUser = userRepository.save(user);
        String token = tokenProvider.generateToken(savedUser);

        return new AuthResponse(
                token,
                tokenProvider.getExpirationMs(),
                new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail(), savedUser.getRole().name(), profile.getPhoneNumber())
        );
    }

    public AuthResponse login(LoginRequest req) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.usernameOrEmail(), req.password())
        );

        User user = (User) authentication.getPrincipal();
        String token = tokenProvider.generateToken(user);
        String phone = user.getProfile() != null ? user.getProfile().getPhoneNumber() : "";

        return new AuthResponse(
                token,
                tokenProvider.getExpirationMs(),
                new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(), phone)
        );
    }

    @Transactional
    public String sendOtp(SendOtpRequest req) {
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        EmailOtp otp = EmailOtp.builder()
                .email(req.email().trim().toLowerCase())
                .otpCode(code)
                .purpose(req.purpose() != null ? req.purpose().toUpperCase() : "LOGIN")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .isUsed(false)
                .attempts(0)
                .build();

        otpRepository.save(otp);
        // In real production, send email via JavaMailSender or SendGrid
        return "OTP sent successfully to " + req.email();
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest req) {
        String email = req.email().trim().toLowerCase();
        String purpose = req.purpose() != null ? req.purpose().toUpperCase() : "LOGIN";

        EmailOtp otp = otpRepository.findTopByEmailAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new BadRequestException("No active OTP found for this email"));

        if (!otp.isValid()) {
            throw new BadRequestException("OTP has expired or reached maximum attempt limit");
        }

        if (!otp.getOtpCode().equals(req.otpCode())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            throw new BadRequestException("Invalid OTP code. Remaining attempts: " + (5 - otp.getAttempts()));
        }

        otp.setUsed(true);
        otpRepository.save(otp);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for email: " + email));

        String token = tokenProvider.generateToken(user);
        String phone = user.getProfile() != null ? user.getProfile().getPhoneNumber() : "";

        return new AuthResponse(
                token,
                tokenProvider.getExpirationMs(),
                new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(), phone)
        );
    }

    public UserDto getCurrentUser(User user) {
        String phone = user.getProfile() != null ? user.getProfile().getPhoneNumber() : "";
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(), phone);
    }
}

