package com.budgetapp.repository

import com.budgetapp.entity.Transaction
import com.budgetapp.entity.TransactionType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID

@Repository
interface TransactionRepository : JpaRepository<Transaction, UUID> {
	fun findByUserId(userId: UUID): List<Transaction>

	@Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.date BETWEEN :startDate AND :endDate")
	fun findByUserIdAndDateBetween(
		@Param("userId") userId: UUID,
		@Param("startDate") startDate: LocalDate,
		@Param("endDate") endDate: LocalDate
	): List<Transaction>

	fun findByUserIdAndCategory(userId: UUID, category: String): List<Transaction>

	fun findByUserIdAndType(userId: UUID, type: TransactionType): List<Transaction>

	@Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND (:startDate IS NULL OR t.date >= :startDate) AND (:endDate IS NULL OR t.date <= :endDate) AND (:category IS NULL OR t.category = :category)")
	fun findByFilters(
		@Param("userId") userId: UUID,
		@Param("startDate") startDate: LocalDate?,
		@Param("endDate") endDate: LocalDate?,
		@Param("category") category: String?
	): List<Transaction>
}