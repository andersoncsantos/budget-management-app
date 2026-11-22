package com.budgetapp.service

import com.budgetapp.dto.CategoryRequest
import com.budgetapp.dto.CategoryResponse
import com.budgetapp.entity.Category
import com.budgetapp.exception.BadRequestException
import com.budgetapp.repository.CategoryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository
) {
    fun getAllByUserId(userId: UUID): List<CategoryResponse> {
        return categoryRepository.findByUserIdOrderByName(userId).map { it.toResponse() }
    }

    @Transactional
    fun create(request: CategoryRequest): CategoryResponse {
        val normalized = request.name.trim().takeIf { it.isNotBlank() }
            ?: throw BadRequestException("Category name is required")

        val existing = categoryRepository.findByUserIdAndNameIgnoreCase(request.userId, normalized)
        if (existing != null) {
            return existing.toResponse()
        }

        val category = Category(
            name = normalized,
            userId = request.userId
        )
        return categoryRepository.save(category).toResponse()
    }

    fun findOrCreate(userId: UUID, name: String): Category {
        val normalized = name.trim()
        return categoryRepository.findByUserIdAndNameIgnoreCase(userId, normalized)
            ?: categoryRepository.save(Category(name = normalized, userId = userId))
    }

    private fun Category.toResponse() = CategoryResponse(
        id = id,
        name = name,
        userId = userId,
        createdAt = createdAt
    )
}
