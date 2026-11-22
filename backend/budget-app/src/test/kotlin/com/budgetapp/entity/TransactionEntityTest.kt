package com.budgetapp.entity

import com.budgetapp.entity.Transaction
import com.budgetapp.entity.TransactionType
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class TransactionEntityTest {

	@Test
	fun `test Transaction entity creation`() {
		val userId = UUID.randomUUID()
		val transaction = Transaction(
			id = UUID.randomUUID(),
			userId = userId,
			amount = BigDecimal("100.50"),
			date = LocalDate.now(),
			category = "Food",
			description = "Lunch",
			type = TransactionType.EXPENSE
		)

		assertNotNull(transaction.id)
		assertEquals(userId, transaction.userId)
		assertEquals(BigDecimal("100.50"), transaction.amount)
		assertEquals("Food", transaction.category)
		assertEquals("Lunch", transaction.description)
		assertEquals(TransactionType.EXPENSE, transaction.type)
	}

	@Test
	fun `test Transaction type enum`() {
		assertEquals(2, TransactionType.values().size)
		assertNotNull(TransactionType.EXPENSE)
		assertNotNull(TransactionType.INCOME)
	}
}