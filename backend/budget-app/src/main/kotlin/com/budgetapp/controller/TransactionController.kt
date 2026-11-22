package com.budgetapp.controller

import com.budgetapp.dto.TransactionBatchRequest
import com.budgetapp.dto.TransactionBatchResponse
import com.budgetapp.dto.TransactionRequest
import com.budgetapp.dto.TransactionResponse
import com.budgetapp.service.TransactionService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/transactions")
class TransactionController(
	private val transactionService: TransactionService
) {
	@GetMapping
	fun getTransactions(
		@RequestParam userId: UUID,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate?,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate?,
		@RequestParam(required = false) category: String?
	): ResponseEntity<List<TransactionResponse>> {
		val transactions = if (startDate != null || endDate != null || category != null) {
			transactionService.getByFilters(userId, startDate, endDate, category)
		} else {
			transactionService.getAllByUserId(userId)
		}
		return ResponseEntity.ok(transactions)
	}

	@GetMapping("/{id}")
	fun getTransaction(@PathVariable id: UUID): ResponseEntity<TransactionResponse> {
		return ResponseEntity.ok(transactionService.getById(id))
	}

	@PostMapping
	fun createTransaction(@RequestBody request: TransactionRequest): ResponseEntity<TransactionResponse> {
		return ResponseEntity.ok(transactionService.create(request))
	}

	@PutMapping("/{id}")
	fun updateTransaction(
		@PathVariable id: UUID,
		@RequestBody request: TransactionRequest
	): ResponseEntity<TransactionResponse> {
		return ResponseEntity.ok(transactionService.update(id, request))
	}

	@DeleteMapping("/{id}")
	fun deleteTransaction(@PathVariable id: UUID): ResponseEntity<Void> {
		transactionService.delete(id)
		return ResponseEntity.noContent().build()
	}

	@PostMapping("/batch")
	fun batchImportTransactions(@RequestBody request: TransactionBatchRequest): ResponseEntity<TransactionBatchResponse> {
		return ResponseEntity.ok(transactionService.batchImport(request))
	}
}