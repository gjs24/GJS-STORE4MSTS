package com.gjs.store.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        String password,

        String phoneNumber
    ) {}

    public record LoginRequest(
        @NotBlank(message = "Email or username is required")
        String usernameOrEmail,

        @NotBlank(message = "Password is required")
        String password
    ) {}

    public record AuthResponse(
        String token,
        String tokenType,
        long expiresInMs,
        UserDto user
    ) {
        public AuthResponse(String token, long expiresInMs, UserDto user) {
            this(token, "Bearer", expiresInMs, user);
        }
    }

    public record UserDto(
        Long id,
        String username,
        String email,
        String role,
        String phoneNumber
    ) {}

    public record SendOtpRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        String purpose
    ) {}

    public record VerifyOtpRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "OTP code is required")
        @Size(min = 6, max = 6, message = "OTP must be 6 digits")
        String otpCode,

        String purpose
    ) {}
}

