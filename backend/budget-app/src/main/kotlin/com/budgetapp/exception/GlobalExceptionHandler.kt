package com.budgetapp.exception

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler

@ControllerAdvice
class GlobalExceptionHandler {

	@ExceptionHandler(ResourceNotFoundException::class)
	fun handleResourceNotFoundException(
		ex: ResourceNotFoundException,
		request: HttpServletRequest
	): ResponseEntity<ErrorResponse> {
		val errorResponse = ErrorResponse(
			status = HttpStatus.NOT_FOUND.value(),
			error = "Not Found",
			message = ex.message ?: "Resource not found",
			path = request.servletPath
		)
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse)
	}

	@ExceptionHandler(BadRequestException::class)
	fun handleBadRequestException(
		ex: BadRequestException,
		request: HttpServletRequest
	): ResponseEntity<ErrorResponse> {
		val errorResponse = ErrorResponse(
			status = HttpStatus.BAD_REQUEST.value(),
			error = "Bad Request",
			message = ex.message ?: "Invalid request",
			path = request.servletPath
		)
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse)
	}

	@ExceptionHandler(UnauthorizedException::class)
	fun handleUnauthorizedException(
		ex: UnauthorizedException,
		request: HttpServletRequest
	): ResponseEntity<ErrorResponse> {
		val errorResponse = ErrorResponse(
			status = HttpStatus.UNAUTHORIZED.value(),
			error = "Unauthorized",
			message = ex.message ?: "Authentication required",
			path = request.servletPath
		)
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse)
	}

	@ExceptionHandler(Exception::class)
	fun handleGenericException(
		ex: Exception,
		request: HttpServletRequest
	): ResponseEntity<ErrorResponse> {
		val errorResponse = ErrorResponse(
			status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
			error = "Internal Server Error",
			message = ex.message ?: "An unexpected error occurred",
			path = request.servletPath
		)
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse)
	}
}