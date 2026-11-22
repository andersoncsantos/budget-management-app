package com.budgetapp.service

import com.budgetapp.dto.BudgetRequest
import com.budgetapp.entity.Budget
import com.budgetapp.repository.BudgetRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.mockito.ArgumentMatchers.any
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class BudgetServiceTest {

	@Mock
	private lateinit var budgetRepository: BudgetRepository

	private lateinit var budgetService: BudgetService

	@BeforeEach
	fun setUp() {
		budgetService = BudgetService(budgetRepository)
	}

	@Test
	fun `test getById returns budget when found`() {
		val userId = UUID.randomUUID()
		val budgetId = UUID.randomUUID()
		val budget = Budget(
			id = budgetId,
			userId = userId,
			category = "Food",
			limitAmount = BigDecimal("500.00"),
			period = "MONTHLY"
		)

		Mockito.`when`(budgetRepository.findById(budgetId)).thenReturn(java.util.Optional.of(budget))

		val result = budgetService.getById(budgetId)

		assertEquals(budgetId, result.id)
		assertEquals(userId, result.userId)
		assertEquals("Food", result.category)
		assertEquals(BigDecimal("500.00"), result.limitAmount)
	}

	@Test
	fun `test create budget`() {
		val userId = UUID.randomUUID()
		val request = BudgetRequest(
			userId = userId,
			category = "Entertainment",
			limitAmount = BigDecimal("200.00"),
			period = "MONTHLY"
		)

		val savedBudget = Budget(
			id = UUID.randomUUID(),
			userId = userId,
			category = request.category,
			limitAmount = request.limitAmount,
			period = request.period
		)

		Mockito.`when`(budgetRepository.save(any(Budget::class.java))).thenReturn(savedBudget)

		val result = budgetService.create(request)

		assertNotNull(result.id)
		assertEquals(userId, result.userId)
		assertEquals("Entertainment", result.category)
		assertEquals(BigDecimal("200.00"), result.limitAmount)
	}

	@Test
	fun `test delete budget`() {
		val budgetId = UUID.randomUUID()

		Mockito.`when`(budgetRepository.existsById(budgetId)).thenReturn(true)
		Mockito.doNothing().`when`(budgetRepository).deleteById(budgetId)

		budgetService.delete(budgetId)

		Mockito.verify(budgetRepository).deleteById(budgetId)
	}
}