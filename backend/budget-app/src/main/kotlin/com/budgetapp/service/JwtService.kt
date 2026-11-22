package com.budgetapp.service

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Service
class JwtService(
	@Value("\${jwt.secret}")
	private val secret: String,

	@Value("\${jwt.expiration}")
	private val expiration: Long
) {
	private val secretKey: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray())

	fun generateToken(userId: UUID, email: String): String {
		return Jwts.builder()
			.subject(userId.toString())
			.claim("email", email)
			.issuedAt(Date())
			.expiration(Date(System.currentTimeMillis() + expiration))
			.signWith(secretKey)
			.compact()
	}

	fun extractUserId(token: String): UUID {
		return UUID.fromString(extractClaims(token).subject)
	}

	fun extractEmail(token: String): String {
		return extractClaims(token).get("email", String::class.java)
	}

	fun validateToken(token: String): Boolean {
		return try {
			extractClaims(token)
			true
		} catch (e: Exception) {
			false
		}
	}

	private fun extractClaims(token: String): Claims {
		return Jwts.parser()
			.verifyWith(secretKey)
			.build()
			.parseSignedClaims(token)
			.payload
	}
}