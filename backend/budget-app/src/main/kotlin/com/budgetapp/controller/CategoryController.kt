package com.budgetapp.controller

import com.budgetapp.dto.CategoryRequest
import com.budgetapp.dto.CategoryResponse
import com.budgetapp.service.CategoryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/categories")
class CategoryController(
    private val categoryService: CategoryService
) {
    @GetMapping
    fun getCategories(@RequestParam userId: UUID): ResponseEntity<List<CategoryResponse>> {
        return ResponseEntity.ok(categoryService.getAllByUserId(userId))
    }

    @PostMapping
    fun createCategory(@RequestBody request: CategoryRequest): ResponseEntity<CategoryResponse> {
        return ResponseEntity.ok(categoryService.create(request))
    }
}
