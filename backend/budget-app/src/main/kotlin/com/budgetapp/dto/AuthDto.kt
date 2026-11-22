package com.budgetapp.dto

data class RegisterRequest(
	val email: String,
	val password: String
)

data class LoginRequest(
	val email: String,
	val password: String
)

data class AuthResponse(
	val userId: String,
	val email: String,
	val token: String
)