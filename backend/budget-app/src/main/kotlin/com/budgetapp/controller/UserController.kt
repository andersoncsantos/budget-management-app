package com.budgetapp.controller

import com.budgetapp.dto.MetadataResponse
import com.budgetapp.dto.MetadataUpdateRequest
import com.budgetapp.service.AuthService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserController(
	private val authService: AuthService
) {
	@GetMapping("/{userId}/metadata")
	fun getMetadata(@PathVariable userId: UUID): ResponseEntity<MetadataResponse> {
		return ResponseEntity.ok(authService.getMetadata(userId))
	}

	@PatchMapping("/{userId}/metadata")
	fun updateMetadata(
		@PathVariable userId: UUID,
		@RequestBody request: MetadataUpdateRequest
	): ResponseEntity<MetadataResponse> {
		return ResponseEntity.ok(authService.updateMetadata(userId, request))
	}
}
