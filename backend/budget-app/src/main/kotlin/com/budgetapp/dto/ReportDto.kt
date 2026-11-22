package com.budgetapp.dto

import java.math.BigDecimal

data class FinancialSummary(
	val totalIncome: BigDecimal,
	val totalExpenses: BigDecimal,
	val netSavings: BigDecimal,
	val categoryBreakdown: List<CategoryBreakdown>
)

data class CategoryBreakdown(
	val category: String,
	val totalAmount: BigDecimal,
	val percentage: BigDecimal
)