package com.budgetapp.dto

import com.budgetapp.entity.TransactionType
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class TransactionRequest(
	val userId: UUID,
	val amount: BigDecimal,
	val date: LocalDate,
	val categoryId: UUID? = null,
	val category: String,
	val description: String?,
	val bank: String?,
	val type: TransactionType
)

data class TransactionResponse(
	val id: UUID?,
	val userId: UUID,
	val amount: BigDecimal,
	val date: LocalDate,
	val categoryId: UUID? = null,
	val category: String,
	val description: String?,
	val bank: String?,
	val type: TransactionType
)
