package com.budgetapp.service

import com.budgetapp.entity.Transaction
import com.budgetapp.entity.TransactionType
import com.budgetapp.repository.TransactionRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class ReportServiceTest {

	@Mock
	private lateinit var transactionRepository: TransactionRepository

	private lateinit var reportService: ReportService

	@BeforeEach
	fun setUp() {
		reportService = ReportService(transactionRepository)
	}

	@Test
	fun `test getFinancialSummary with mixed transactions`() {
		val userId = UUID.randomUUID()
		val transactions = listOf(
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("1000.00"),
				date = LocalDate.now(),
				category = "Salary",
				description = "Monthly salary",
				type = TransactionType.INCOME
			),
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("200.00"),
				date = LocalDate.now(),
				category = "Food",
				description = "Groceries",
				type = TransactionType.EXPENSE
			),
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("300.00"),
				date = LocalDate.now(),
				category = "Rent",
				description = "Monthly rent",
				type = TransactionType.EXPENSE
			)
		)

		`when`(transactionRepository.findByUserId(userId)).thenReturn(transactions)

		val result = reportService.getFinancialSummary(userId)

		assertEquals(BigDecimal("1000.00"), result.totalIncome)
		assertEquals(BigDecimal("500.00"), result.totalExpenses)
		assertEquals(BigDecimal("500.00"), result.netSavings)
		assertEquals(2, result.categoryBreakdown.size)
	}

	@Test
	fun `test getFinancialSummary with only expenses`() {
		val userId = UUID.randomUUID()
		val transactions = listOf(
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("100.00"),
				date = LocalDate.now(),
				category = "Food",
				description = "Lunch",
				type = TransactionType.EXPENSE
			)
		)

		`when`(transactionRepository.findByUserId(userId)).thenReturn(transactions)

		val result = reportService.getFinancialSummary(userId)

		assertEquals(BigDecimal.ZERO, result.totalIncome)
		assertEquals(BigDecimal("100.00"), result.totalExpenses)
		assertEquals(BigDecimal("-100.00"), result.netSavings)
	}

	@Test
	fun `test getFinancialSummary with no transactions`() {
		val userId = UUID.randomUUID()

		`when`(transactionRepository.findByUserId(userId)).thenReturn(emptyList())

		val result = reportService.getFinancialSummary(userId)

		assertEquals(BigDecimal.ZERO, result.totalIncome)
		assertEquals(BigDecimal.ZERO, result.totalExpenses)
		assertEquals(BigDecimal.ZERO, result.netSavings)
		assertTrue(result.categoryBreakdown.isEmpty())
	}

	@Test
	fun `test category breakdown percentages`() {
		val userId = UUID.randomUUID()
		val transactions = listOf(
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("75.00"),
				date = LocalDate.now(),
				category = "Food",
				description = null,
				type = TransactionType.EXPENSE
			),
			Transaction(
				id = UUID.randomUUID(),
				userId = userId,
				amount = BigDecimal("25.00"),
				date = LocalDate.now(),
				category = "Transport",
				description = null,
				type = TransactionType.EXPENSE
			)
		)

		`when`(transactionRepository.findByUserId(userId)).thenReturn(transactions)

		val result = reportService.getFinancialSummary(userId)

		assertEquals(2, result.categoryBreakdown.size)
		
		val foodCategory = result.categoryBreakdown.find { it.category == "Food" }
		assertNotNull(foodCategory)
		assertEquals(BigDecimal("75.00"), foodCategory!!.totalAmount)
		
		val transportCategory = result.categoryBreakdown.find { it.category == "Transport" }
		assertNotNull(transportCategory)
		assertEquals(BigDecimal("25.00"), transportCategory!!.totalAmount)
	}
}