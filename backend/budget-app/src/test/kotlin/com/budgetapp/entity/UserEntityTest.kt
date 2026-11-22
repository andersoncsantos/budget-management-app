package com.budgetapp.entity
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import java.util.UUID

class UserEntityTest {

	@Test
	fun `test User entity creation`() {
		val user = User(
			id = UUID.randomUUID(),
			email = "test@example.com",
			password = "hashedPassword",
			createdAt = LocalDateTime.now()
		)

		assertNotNull(user.id)
		assertEquals("test@example.com", user.email)
		assertEquals("hashedPassword", user.password)
		assertNotNull(user.createdAt)
	}

	@Test
	fun `test User entity with null id`() {
		val user = User(
			email = "test@example.com",
			password = "hashedPassword"
		)

		assertNull(user.id)
		assertEquals("test@example.com", user.email)
	}
}