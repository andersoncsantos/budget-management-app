package com.budgetapp.dto

import java.math.BigDecimal
import java.util.UUID

data class BudgetRequest(
	val userId: UUID,
	val category: String,
	val limitAmount: BigDecimal,
	val period: String = "MONTHLY"
)

data class BudgetResponse(
	val id: UUID?,
	val userId: UUID,
	val category: String,
	val limitAmount: BigDecimal,
	val period: String
)