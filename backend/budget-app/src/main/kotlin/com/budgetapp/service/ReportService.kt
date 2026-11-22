package com.budgetapp.service

import com.budgetapp.dto.CategoryBreakdown
import com.budgetapp.dto.FinancialSummary
import com.budgetapp.entity.TransactionType
import com.budgetapp.repository.TransactionRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@Service
class ReportService(
	private val transactionRepository: TransactionRepository
) {
	fun getFinancialSummary(userId: UUID): FinancialSummary {
		val transactions = transactionRepository.findByUserId(userId)

		val totalIncome = transactions
			.filter { it.type == TransactionType.INCOME }
			.sumOf { it.amount }

		val totalExpenses = transactions
			.filter { it.type == TransactionType.EXPENSE }
			.sumOf { it.amount }

		val netSavings = totalIncome.subtract(totalExpenses)

		val categoryBreakdown = calculateCategoryBreakdown(transactions)

		return FinancialSummary(
			totalIncome = totalIncome,
			totalExpenses = totalExpenses,
			netSavings = netSavings,
			categoryBreakdown = categoryBreakdown
		)
	}

	private fun calculateCategoryBreakdown(transactions: List<com.budgetapp.entity.Transaction>): List<CategoryBreakdown> {
		val expensesByCategory = transactions
			.filter { it.type == TransactionType.EXPENSE }
			.groupBy { it.category }
			.mapValues { (_, txns) -> txns.sumOf { it.amount } }

		val totalExpenses = expensesByCategory.values.sumOf { it }

		return expensesByCategory.map { (category, amount) ->
			val percentage = if (totalExpenses > BigDecimal.ZERO) {
				amount.divide(totalExpenses, 4, RoundingMode.HALF_UP)
					.multiply(BigDecimal(100))
			} else {
				BigDecimal.ZERO
			}

			CategoryBreakdown(
				category = category,
				totalAmount = amount,
				percentage = percentage
			)
		}.sortedByDescending { it.totalAmount }
	}
}