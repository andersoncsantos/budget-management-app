package com.budgetapp.config

import com.budgetapp.service.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.OncePerRequestFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(
	private val jwtService: JwtService,
	@Value("\${cors.allowed-origins}") private val allowedOrigins: String
) {
	@Bean
	fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

	@Bean
	fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
		http
			.csrf { it.disable() }
			.cors {}
			.sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
			.authorizeHttpRequests {
				it
					.requestMatchers("/api/auth/**").permitAll()
					.anyRequest().permitAll()
			}
			.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter::class.java)

		return http.build()
	}

	@Bean
	fun corsConfigurationSource(): CorsConfigurationSource {
		val configuration = CorsConfiguration()
		configuration.allowedOrigins = allowedOrigins.split(",")
		configuration.allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
		configuration.allowedHeaders = listOf("*")
		configuration.allowCredentials = true
		val source = UrlBasedCorsConfigurationSource()
		source.registerCorsConfiguration("/**", configuration)
		return source
	}

	@Bean
	fun jwtAuthenticationFilter(): OncePerRequestFilter {
		return object : OncePerRequestFilter() {
			override fun doFilterInternal(
				request: HttpServletRequest,
				response: HttpServletResponse,
				filterChain: FilterChain
			) {
				val authHeader = request.getHeader("Authorization")

				if (authHeader != null && authHeader.startsWith("Bearer ")) {
					val token = authHeader.substring(7)
					try {
						if (jwtService.validateToken(token)) {
							// Token is valid, continue with request
							// In a full implementation, we'd set authentication here
						}
					} catch (e: Exception) {
						// Invalid token, continue without authentication
					}
				}

				filterChain.doFilter(request, response)
			}
		}
	}
}