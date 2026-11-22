package com.budgetapp.service

import com.budgetapp.dto.AuthResponse
import com.budgetapp.dto.LoginRequest
import com.budgetapp.dto.MetadataResponse
import com.budgetapp.dto.MetadataUpdateRequest
import com.budgetapp.dto.RegisterRequest
import com.budgetapp.entity.User
import com.budgetapp.exception.BadRequestException
import com.budgetapp.exception.ResourceNotFoundException
import com.budgetapp.exception.UnauthorizedException
import com.budgetapp.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Service
class AuthService(
	private val userRepository: UserRepository,
	private val passwordEncoder: PasswordEncoder,
	private val jwtService: JwtService
) {
	fun register(request: RegisterRequest): AuthResponse {
		if (userRepository.findByEmail(request.email) != null) {
			throw BadRequestException("Email already registered")
		}

		val user = User(
			email = request.email,
			password = passwordEncoder.encode(request.password)
		)

		val savedUser = userRepository.save(user)
		val token = jwtService.generateToken(savedUser.id!!, savedUser.email)

		return AuthResponse(
			userId = savedUser.id.toString(),
			email = savedUser.email,
			token = token
		)
	}

	fun login(request: LoginRequest): AuthResponse {
		val user = userRepository.findByEmail(request.email)
			?: throw UnauthorizedException("Invalid credentials")

		if (!passwordEncoder.matches(request.password, user.password)) {
			throw UnauthorizedException("Invalid credentials")
		}

		val token = jwtService.generateToken(user.id!!, user.email)

		return AuthResponse(
			userId = user.id.toString(),
			email = user.email,
			token = token
		)
	}

	fun getUserById(userId: UUID): User? {
		return userRepository.findById(userId).orElse(null)
	}

	fun getMetadata(userId: UUID): MetadataResponse {
		val user = userRepository.findById(userId)
			.orElseThrow { ResourceNotFoundException("User not found") }
		return MetadataResponse(
			realBalance = user.realBalance,
			updatedDate = user.updatedDate?.toString()
		)
	}

	fun updateMetadata(userId: UUID, request: MetadataUpdateRequest): MetadataResponse {
		val user = userRepository.findById(userId)
			.orElseThrow { ResourceNotFoundException("User not found") }
		user.realBalance = request.realBalance
		user.updatedDate = LocalDateTime.now()
		val saved = userRepository.save(user)
		return MetadataResponse(
			realBalance = saved.realBalance,
			updatedDate = saved.updatedDate?.toString()
		)
	}
}