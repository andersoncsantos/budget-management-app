# Backend Implementation TODO List

This document outlines the implementation tasks for the Budget App Backend API based on `SPEC.md`.

---

## Phase 1: Project Setup & Configuration

- [x] Set up Gradle project with Kotlin DSL (build.gradle.kts, settings.gradle.kts)
- [x] Configure Spring Boot 3.x dependencies in build.gradle.kts
- [x] Configure PostgreSQL connection in application.properties
- [x] Create main application class BudgetApplication.kt

---

## Phase 2: Entity Layer

- [x] Create User entity with JPA annotations (id, email, password, createdAt)
- [x] Create Transaction entity with JPA annotations (id, userId, amount, date, category, description, type)
- [x] Create Budget entity with JPA annotations (id, userId, category, limitAmount, period)
- [x] Create TransactionType enum (EXPENSE, INCOME)

---

## Phase 3: Repository Layer

- [x] Create UserRepository interface
- [x] Create TransactionRepository interface
- [x] Create BudgetRepository interface
- [x] Add custom query methods for filtering (by userId, date range, category)

---

## Phase 4: DTO Layer

- [x] Create Auth DTOs (RegisterRequest, LoginRequest, AuthResponse)
- [x] Create Transaction DTOs (TransactionRequest, TransactionResponse)
- [x] Create Budget DTOs (BudgetRequest, BudgetResponse)
- [x] Create Report DTOs (FinancialSummary, CategoryBreakdown)

---

## Phase 5: Service Layer

- [x] Implement AuthService (register, login, password hashing)
- [x] Implement TransactionService (CRUD operations, filtering)
- [x] Implement BudgetService (CRUD operations)
- [x] Implement ReportService (calculate summaries, category breakdowns)

---

## Phase 6: Controller Layer

- [x] Implement AuthController (/api/auth/register, /api/auth/login)
- [x] Implement TransactionController (GET, POST, PUT, DELETE /api/transactions)
- [x] Implement BudgetController (GET, POST /api/budgets)
- [x] Implement ReportController (GET /api/reports/summary)

---

## Phase 7: Exception Handling

- [x] Create custom exception classes (ResourceNotFoundException, etc.)
- [x] Implement global exception handler (ControllerAdvice)
- [x] Create error response DTO
- [x] Ensure consistent JSON error responses

---

## Phase 8: Security Configuration

- [x] Configure Spring Security
- [x] Set up JWT authentication (if required)
- [x] Configure endpoint access rules

---

## Phase 9: Testing

- [x] Write unit tests for User entity
- [x] Write unit tests for TransactionService
- [x] Write unit tests for BudgetService
- [x] Write unit tests for ReportService
- [x] Write unit tests for controllers

---

## Phase 10: Final Validation

- [x] Verify all entities properly mapped with JPA annotations
- [x] Verify CRUD operations work for Transactions and Budgets
- [x] Verify Reports endpoint returns aggregated data
- [x] Verify error handling returns consistent JSON responses
- [x] Verify application compiles without errors
- [x] Verify all basic unit tests pass

---

## Project Structure Reference

```
budget-app/backend/
├── build.gradle.kts
├── settings.gradle.kts
├── src/main/kotlin/com/budgetapp/
│   ├── BudgetApplication.kt
│   ├── config/
│   ├── controller/
│   │   ├── AuthController.kt
│   │   ├── TransactionController.kt
│   │   ├── BudgetController.kt
│   │   └── ReportController.kt
│   ├── service/
│   ├── repository/
│   ├── entity/
│   ├── dto/
│   └── exception/
├── src/main/resources/
│   └── application.properties
└── src/test/kotlin/...
```

---

## API Endpoints Summary

### Authentication
- POST /api/auth/register
- POST /api/auth/login

### Transactions
- GET /api/transactions?userId=&startDate=&endDate=&category=
- POST /api/transactions
- PUT /api/transactions/{id}
- DELETE /api/transactions/{id}

### Budgets
- GET /api/budgets?userId=
- POST /api/budgets

### Reports
- GET /api/reports/summary?userId=