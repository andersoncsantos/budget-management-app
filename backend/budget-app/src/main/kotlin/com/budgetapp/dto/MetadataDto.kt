package com.budgetapp.dto

import java.math.BigDecimal

data class MetadataResponse(
	val realBalance: BigDecimal,
	val updatedDate: String?
)

data class MetadataUpdateRequest(
	val realBalance: BigDecimal
)
