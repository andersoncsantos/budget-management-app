package com.budgetapp.dto

import com.budgetapp.entity.TransactionType
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * Request DTO for batch importing transactions
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class TransactionBatchRequest(
	val userId: UUID,
	val transactions: List<TransactionImportItem>
)

/**
 * Individual transaction item in a batch import request
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class TransactionImportItem(
	val amount: Any? = null,
	val date: Any? = null,
	val category: String? = null,
	val description: String? = null,
	val bank: String? = null,
	val type: TransactionType? = null,
	val lineNumber: Int? = null
)

/**
 * Response DTO for batch import results
 */
data class TransactionBatchResponse(
	val totalRecords: Int,
	val importedRecords: Int,
	val failedRecords: Int,
	val errors: List<TransactionImportError>
)

/**
 * Error details for a single failed transaction in a batch
 */
data class TransactionImportError(
	val line: Int?,
	val message: String
)

/**
 * Extension function to parse amount from Any to BigDecimal
 */
fun TransactionImportItem?.parseAmountValue(): BigDecimal? {
	if (this?.amount == null) return null
	return try {
		val amountStr = when (amount) {
			is Number -> amount.toString()
			is String -> amount
			else -> return null
		}
		parseAmount(amountStr)
	} catch (e: Exception) {
		null
	}
}

/**
 * Extension function to parse date from Any to LocalDate
 */
fun TransactionImportItem?.parseDateValue(): LocalDate? {
	if (this?.date == null) return null
	return try {
		// Handle different types
		val dateValue = date
		val dateStr: String = when (dateValue) {
			is Number -> {
				// Unix timestamp (milliseconds)
				Instant.ofEpochMilli(dateValue.toLong())
					.atZone(ZoneId.systemDefault())
					.toLocalDate()
					.toString()
			}
			is String -> dateValue
			else -> return null
		}
		parseDate(dateStr)
	} catch (e: Exception) {
		null
	}
}

/**
 * Helper function to parse amount from string to BigDecimal
 */
fun parseAmount(amountStr: String): BigDecimal? {
	if (amountStr.isBlank()) return null
	return try {
		// Remove currency symbols and whitespace
		val cleaned = amountStr.replace("[R$\\s]".toRegex(), "")
		// Handle Brazilian format (1.234,56) vs US format (1,234.56)
		val normalized = when {
			cleaned.contains(",") && cleaned.contains(".") -> {
				// Both - check which comes last
				if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
					// Brazilian format: 1.234,56 -> 1234.56
					cleaned.replace(".", "").replace(",", ".")
				} else {
					// US format: 1,234.56 -> 1234.56
					cleaned.replace(",", "")
				}
			}
			cleaned.contains(",") -> {
				// Just comma - could be decimal separator (Brazilian) or thousands separator
				// If there's only one comma and it's followed by at most 2 digits, treat as decimal
				if (cleaned.indexOf(",") == cleaned.length - 3 || cleaned.indexOf(",") == cleaned.length - 2) {
					cleaned.replace(",", ".")
				} else {
					cleaned.replace(",", "")
				}
			}
			else -> cleaned
		}
		BigDecimal(normalized)
	} catch (e: Exception) {
		null
	}
}

/**
 * Helper function to parse date from string to LocalDate
 */
fun parseDate(dateStr: String): LocalDate? {
	if (dateStr.isBlank()) return null
	return try {
		// Try common formats
		val formats = listOf(
			DateTimeFormatter.ISO_LOCAL_DATE,      // yyyy-MM-dd
			DateTimeFormatter.ofPattern("dd/MM/yyyy"), // dd/MM/yyyy
			DateTimeFormatter.ofPattern("dd-MM-yyyy"), // dd-MM-yyyy
			DateTimeFormatter.ofPattern("yyyy-MM-dd"), // yyyy-MM-dd
		)
		
		for (formatter in formats) {
			try {
				return LocalDate.parse(dateStr.trim(), formatter)
			} catch (e: Exception) {
				// Try next format
			}
		}
		null
	} catch (e: Exception) {
		null
	}
}