package com.budgetapp.controller

import com.budgetapp.dto.TransactionRequest
import com.budgetapp.dto.TransactionResponse
import com.budgetapp.entity.TransactionType
import com.budgetapp.service.TransactionService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@ExtendWith(MockitoExtension::class)
class TransactionControllerTest {

	private lateinit var mockMvc: MockMvc

	@Mock
	private lateinit var transactionService: TransactionService

	private val objectMapper = ObjectMapper().registerModule(JavaTimeModule())

	@BeforeEach
	fun setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(TransactionController(transactionService)).build()
	}

	@Test
	fun `test getTransactions returns list of transactions`() {
		val userId = UUID.randomUUID()
		val transactionId = UUID.randomUUID()
		val transactions = listOf(
			TransactionResponse(
				id = transactionId,
				userId = userId,
				amount = BigDecimal("100.00"),
				date = LocalDate.now(),
				category = "Food",
				description = "Test",
				bank = null,
				type = TransactionType.EXPENSE
			)
		)

		Mockito.`when`(transactionService.getAllByUserId(userId)).thenReturn(transactions)

		mockMvc.perform(
			get("/api/transactions")
				.param("userId", userId.toString())
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$[0].id").value(transactionId.toString()))
			.andExpect(jsonPath("$[0].category").value("Food"))
	}

	@Test
	fun `test deleteTransaction returns no content`() {
		val transactionId = UUID.randomUUID()

		Mockito.doNothing().`when`(transactionService).delete(transactionId)

		mockMvc.perform(
			delete("/api/transactions/{id}", transactionId)
		)
			.andExpect(status().isNoContent())
	}
}