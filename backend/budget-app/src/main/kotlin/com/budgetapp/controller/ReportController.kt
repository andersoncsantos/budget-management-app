package com.budgetapp.controller

import com.budgetapp.dto.FinancialSummary
import com.budgetapp.service.ReportService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/reports")
class ReportController(
	private val reportService: ReportService
) {
	@GetMapping("/summary")
	fun getFinancialSummary(@RequestParam userId: UUID): ResponseEntity<FinancialSummary> {
		return ResponseEntity.ok(reportService.getFinancialSummary(userId))
	}
}