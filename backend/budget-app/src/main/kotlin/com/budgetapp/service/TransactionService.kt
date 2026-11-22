package com.budgetapp.service

import com.budgetapp.dto.*
import com.budgetapp.entity.Transaction
import com.budgetapp.entity.TransactionType
import com.budgetapp.exception.BadRequestException
import com.budgetapp.exception.ResourceNotFoundException
import com.budgetapp.repository.CategoryRepository
import com.budgetapp.repository.TransactionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
class TransactionService(
	private val transactionRepository: TransactionRepository,
	private val categoryRepository: CategoryRepository,
	private val categoryService: CategoryService
) {
	fun getAllByUserId(userId: UUID): List<TransactionResponse> {
		return transactionRepository.findByUserId(userId).map { it.toResponse() }
	}

	fun getByFilters(
		userId: UUID,
		startDate: LocalDate?,
		endDate: LocalDate?,
		category: String?
	): List<TransactionResponse> {
		return transactionRepository.findByFilters(userId, startDate, endDate, category)
			.map { it.toResponse() }
	}

	fun getById(id: UUID): TransactionResponse {
		return transactionRepository.findById(id)
			.orElseThrow { ResourceNotFoundException("Transaction not found") }
			.toResponse()
	}

	fun create(request: TransactionRequest): TransactionResponse {
		val resolvedCategoryId: UUID?
		val resolvedCategoryName: String

		if (request.categoryId != null) {
			val category = categoryRepository.findById(request.categoryId)
				.orElseThrow { BadRequestException("Category not found") }
			resolvedCategoryId = category.id
			resolvedCategoryName = category.name
		} else {
			val category = categoryService.findOrCreate(request.userId, request.category)
			resolvedCategoryId = category.id
			resolvedCategoryName = category.name
		}

		val transaction = Transaction(
			userId = request.userId,
			categoryId = resolvedCategoryId,
			category = resolvedCategoryName,
			amount = request.amount,
			date = request.date,
			description = request.description,
			bank = request.bank,
			type = request.type
		)
		return transactionRepository.save(transaction).toResponse()
	}

	fun update(id: UUID, request: TransactionRequest): TransactionResponse {
		val existing = transactionRepository.findById(id)
			.orElseThrow { ResourceNotFoundException("Transaction not found") }

		val resolvedCategoryId: UUID?
		val resolvedCategoryName: String

		if (request.categoryId != null) {
			val category = categoryRepository.findById(request.categoryId)
				.orElseThrow { BadRequestException("Category not found") }
			resolvedCategoryId = category.id
			resolvedCategoryName = category.name
		} else {
			val category = categoryService.findOrCreate(request.userId, request.category)
			resolvedCategoryId = category.id
			resolvedCategoryName = category.name
		}

		val updated = existing.copy(
			userId = request.userId,
			categoryId = resolvedCategoryId,
			category = resolvedCategoryName,
			amount = request.amount,
			date = request.date,
			description = request.description,
			bank = request.bank,
			type = request.type
		)

		return transactionRepository.save(updated).toResponse()
	}

	fun delete(id: UUID) {
		if (!transactionRepository.existsById(id)) {
			throw ResourceNotFoundException("Transaction not found")
		}
		transactionRepository.deleteById(id)
	}

	@Transactional
	fun batchImport(request: TransactionBatchRequest): TransactionBatchResponse {
		val errors = mutableListOf<TransactionImportError>()
		val validTransactions = mutableListOf<Transaction>()

		request.transactions.forEachIndexed { index, item ->
			val lineNumber = item.lineNumber ?: (index + 2)

			val parsedAmount = item.parseAmountValue()
			if (parsedAmount == null) {
				errors.add(TransactionImportError(lineNumber, "Invalid amount format"))
				return@forEachIndexed
			}

			val parsedDate = item.parseDateValue()
			if (parsedDate == null) {
				errors.add(TransactionImportError(lineNumber, "Invalid date format"))
				return@forEachIndexed
			}

			val categoryName = item.category ?: "Other"

			val type = item.type ?: TransactionType.EXPENSE

			val validationError = validateTransactionImport(parsedAmount, parsedDate, categoryName, item.description)
			if (validationError != null) {
				errors.add(TransactionImportError(lineNumber, validationError))
				return@forEachIndexed
			}

			val category = categoryService.findOrCreate(request.userId, categoryName)

			val transaction = Transaction(
				userId = request.userId,
				categoryId = category.id,
				category = category.name,
				amount = parsedAmount,
				date = parsedDate,
				description = item.description,
				bank = item.bank,
				type = type
			)
			validTransactions.add(transaction)
		}

		if (validTransactions.isNotEmpty()) {
			transactionRepository.saveAll(validTransactions)
		}

		return TransactionBatchResponse(
			totalRecords = request.transactions.size,
			importedRecords = validTransactions.size,
			failedRecords = errors.size,
			errors = errors
		)
	}

	private fun validateTransactionImport(amount: BigDecimal, date: LocalDate, category: String?, description: String?): String? {
		if (amount <= BigDecimal.ZERO) {
			return "Amount must be positive"
		}
		if (date.isAfter(LocalDate.now())) {
			return "Date cannot be in the future"
		}
		if (category.isNullOrBlank()) {
			return "Category is required"
		}
		if (category.length > 100) {
			return "Category name too long (max 100 characters)"
		}
		if (description != null && description.length > 255) {
			return "Description too long (max 255 characters)"
		}
		return null
	}

	private fun Transaction.toResponse() = TransactionResponse(
		id = id,
		userId = userId,
		amount = amount,
		date = date,
		categoryId = categoryId,
		category = category,
		description = description,
		bank = bank,
		type = type
	)
}
