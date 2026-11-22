package com.budgetapp.dto

import java.time.LocalDateTime
import java.util.UUID

data class CategoryRequest(
    val name: String,
    val userId: UUID
)

data class CategoryResponse(
    val id: UUID?,
    val name: String,
    val userId: UUID,
    val createdAt: LocalDateTime
)
