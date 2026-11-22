package com.budgetapp.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "users")
class User(
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	val id: UUID? = null,

	@Column(unique = true, nullable = false)
	val email: String,

	@Column(nullable = false)
	var password: String,

	@Column(name = "created_at")
	val createdAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "real_balance", precision = 14, scale = 2)
	var realBalance: BigDecimal = BigDecimal.ZERO,

	@Column(name = "updated_date")
	var updatedDate: LocalDateTime? = null
) {
	fun copy(
		id: UUID? = this.id,
		email: String = this.email,
		password: String = this.password,
		createdAt: LocalDateTime = this.createdAt,
		realBalance: BigDecimal = this.realBalance,
		updatedDate: LocalDateTime? = this.updatedDate
	) = User(id, email, password, createdAt, realBalance, updatedDate)
}