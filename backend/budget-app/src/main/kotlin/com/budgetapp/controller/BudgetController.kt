package com.budgetapp.controller

import com.budgetapp.dto.BudgetRequest
import com.budgetapp.dto.BudgetResponse
import com.budgetapp.service.BudgetService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/budgets")
class BudgetController(
	private val budgetService: BudgetService
) {
	@GetMapping
	fun getBudgets(@RequestParam userId: UUID): ResponseEntity<List<BudgetResponse>> {
		return ResponseEntity.ok(budgetService.getAllByUserId(userId))
	}

	@GetMapping("/{id}")
	fun getBudget(@PathVariable id: UUID): ResponseEntity<BudgetResponse> {
		return ResponseEntity.ok(budgetService.getById(id))
	}

	@PostMapping
	fun createBudget(@RequestBody request: BudgetRequest): ResponseEntity<BudgetResponse> {
		return ResponseEntity.ok(budgetService.create(request))
	}

	@PutMapping("/{id}")
	fun updateBudget(
		@PathVariable id: UUID,
		@RequestBody request: BudgetRequest
	): ResponseEntity<BudgetResponse> {
		return ResponseEntity.ok(budgetService.update(id, request))
	}

	@DeleteMapping("/{id}")
	fun deleteBudget(@PathVariable id: UUID): ResponseEntity<Void> {
		budgetService.delete(id)
		return ResponseEntity.noContent().build()
	}
}