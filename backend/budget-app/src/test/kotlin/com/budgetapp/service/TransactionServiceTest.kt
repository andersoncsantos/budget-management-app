package com.budgetapp.service

import com.budgetapp.dto.TransactionRequest
import com.budgetapp.dto.TransactionResponse
import com.budgetapp.entity.Category
import com.budgetapp.entity.Transaction
import com.budgetapp.entity.TransactionType
import com.budgetapp.exception.ResourceNotFoundException
import com.budgetapp.repository.CategoryRepository
import com.budgetapp.repository.TransactionRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.mockito.ArgumentMatchers.any
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Optional
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class TransactionServiceTest {

	@Mock
	private lateinit var transactionRepository: TransactionRepository

	@Mock
	private lateinit var categoryRepository: CategoryRepository

	@Mock
	private lateinit var categoryService: CategoryService

	private lateinit var transactionService: TransactionService

	@BeforeEach
	fun setUp() {
		transactionService = TransactionService(transactionRepository, categoryRepository, categoryService)
	}

	@Test
	fun `test getById returns transaction when found`() {
		val userId = UUID.randomUUID()
		val transactionId = UUID.randomUUID()
		val transaction = Transaction(
			id = transactionId,
			userId = userId,
			amount = BigDecimal("100.00"),
			date = LocalDate.now(),
			category = "Food",
			description = "Test",
			type = TransactionType.EXPENSE
		)

		`when`(transactionRepository.findById(transactionId)).thenReturn(Optional.of(transaction))

		val result = transactionService.getById(transactionId)

		assertEquals(transactionId, result.id)
		assertEquals(userId, result.userId)
		assertEquals(BigDecimal("100.00"), result.amount)
	}

	@Test
	fun `test getById throws exception when not found`() {
		val transactionId = UUID.randomUUID()

		`when`(transactionRepository.findById(transactionId)).thenReturn(Optional.empty())

		assertThrows(ResourceNotFoundException::class.java) {
			transactionService.getById(transactionId)
		}
	}

	@Test
	fun `test create transaction`() {
		val userId = UUID.randomUUID()
		val request = TransactionRequest(
			userId = userId,
			amount = BigDecimal("50.00"),
			date = LocalDate.now(),
			category = "Transport",
			description = "Bus fare",
			bank = null,
			type = TransactionType.EXPENSE
		)

		val category = Category(name = "Transport", userId = userId)
		`when`(categoryService.findOrCreate(request.userId, request.category)).thenReturn(category)

		val savedTransaction = Transaction(
			id = UUID.randomUUID(),
			userId = userId,
			categoryId = category.id,
			amount = BigDecimal("50.00"),
			date = request.date,
			category = request.category,
			description = request.description,
			bank = null,
			type = request.type
		)

		`when`(transactionRepository.save(any(Transaction::class.java))).thenReturn(savedTransaction)

		val result = transactionService.create(request)

		assertNotNull(result.id)
		assertEquals(userId, result.userId)
		assertEquals(BigDecimal("50.00"), result.amount)
		verify(transactionRepository).save(any(Transaction::class.java))
	}

	@Test
	fun `test delete transaction`() {
		val transactionId = UUID.randomUUID()

		`when`(transactionRepository.existsById(transactionId)).thenReturn(true)
		doNothing().`when`(transactionRepository).deleteById(transactionId)

		transactionService.delete(transactionId)

		verify(transactionRepository).deleteById(transactionId)
	}

	@Test
	fun `test delete throws exception when not found`() {
		val transactionId = UUID.randomUUID()

		`when`(transactionRepository.existsById(transactionId)).thenReturn(false)

		assertThrows(ResourceNotFoundException::class.java) {
			transactionService.delete(transactionId)
		}
	}
}