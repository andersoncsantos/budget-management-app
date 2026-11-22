package com.budgetapp.repository

import com.budgetapp.entity.Category
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CategoryRepository : JpaRepository<Category, UUID> {
    fun findByUserIdOrderByName(userId: UUID): List<Category>
    fun findByUserIdAndNameIgnoreCase(userId: UUID, name: String): Category?
}
