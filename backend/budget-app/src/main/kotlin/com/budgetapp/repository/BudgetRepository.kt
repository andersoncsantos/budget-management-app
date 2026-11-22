package com.budgetapp.repository

import com.budgetapp.entity.Budget
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface BudgetRepository : JpaRepository<Budget, UUID> {
	fun findByUserId(userId: UUID): List<Budget>
	fun findByUserIdAndCategory(userId: UUID, category: String): Budget?
}