package com.budgetapp.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "transactions")
class Transaction(
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	val id: UUID? = null,

	@Column(name = "user_id", nullable = false)
	val userId: UUID,

	@Column(name = "category_id")
	val categoryId: UUID? = null,

	@Column(precision = 19, scale = 2, nullable = false)
	val amount: BigDecimal,

	@Column(nullable = false)
	val date: LocalDate,

	@Column(nullable = false)
	val category: String,

	@Column
	val description: String? = null,


	@Column
	val bank: String? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false)
	val type: TransactionType
) {
	fun copy(
		id: UUID? = this.id,
		userId: UUID = this.userId,
		categoryId: UUID? = this.categoryId,
		amount: BigDecimal = this.amount,
		date: LocalDate = this.date,
		category: String = this.category,
		description: String? = this.description,
		bank: String? = this.bank,
		type: TransactionType = this.type
	) = Transaction(id, userId, categoryId, amount, date, category, description, bank, type)
}
