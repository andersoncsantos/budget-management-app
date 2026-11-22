package com.budgetapp.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "budgets")
class Budget(
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	val id: UUID? = null,

	@Column(name = "user_id", nullable = false)
	val userId: UUID,

	@Column(nullable = false)
	val category: String,

	@Column(name = "limit_amount", precision = 19, scale = 2, nullable = false)
	val limitAmount: BigDecimal,

	@Column(nullable = false)
	val period: String = "MONTHLY"
) {
	fun copy(
		id: UUID? = this.id,
		userId: UUID = this.userId,
		category: String = this.category,
		limitAmount: BigDecimal = this.limitAmount,
		period: String = this.period
	) = Budget(id, userId, category, limitAmount, period)
}