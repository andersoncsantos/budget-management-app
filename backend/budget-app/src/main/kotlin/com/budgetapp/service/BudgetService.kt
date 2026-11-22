package com.budgetapp.service

import com.budgetapp.dto.BudgetRequest
import com.budgetapp.dto.BudgetResponse
import com.budgetapp.entity.Budget
import com.budgetapp.exception.ResourceNotFoundException
import com.budgetapp.repository.BudgetRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class BudgetService(
	private val budgetRepository: BudgetRepository
) {
	fun getAllByUserId(userId: UUID): List<BudgetResponse> {
		return budgetRepository.findByUserId(userId).map { it.toResponse() }
	}

	fun getById(id: UUID): BudgetResponse {
		return budgetRepository.findById(id)
			.orElseThrow { ResourceNotFoundException("Budget not found") }
			.toResponse()
	}

	fun create(request: BudgetRequest): BudgetResponse {
		val budget = Budget(
			userId = request.userId,
			category = request.category,
			limitAmount = request.limitAmount,
			period = request.period
		)
		return budgetRepository.save(budget).toResponse()
	}

	fun update(id: UUID, request: BudgetRequest): BudgetResponse {
		val existing = budgetRepository.findById(id)
			.orElseThrow { ResourceNotFoundException("Budget not found") }

		val updated = existing.copy(
			userId = request.userId,
			category = request.category,
			limitAmount = request.limitAmount,
			period = request.period
		)

		return budgetRepository.save(updated).toResponse()
	}

	fun delete(id: UUID) {
		if (!budgetRepository.existsById(id)) {
			throw ResourceNotFoundException("Budget not found")
		}
		budgetRepository.deleteById(id)
	}

	private fun Budget.toResponse() = BudgetResponse(
		id = id,
		userId = userId,
		category = category,
		limitAmount = limitAmount,
		period = period
	)
}