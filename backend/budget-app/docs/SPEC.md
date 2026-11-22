# Budget App Backend API Specification

## 🎯 Project Overview
RESTful API for a Personal Finance/Budget Tracking Application that provides persistence and business logic for managing user accounts, financial transactions, budget limits, and financial reporting.

## 🛠️ Technology Stack
| Component | Technology |
|-----------|------------|
| Language | Kotlin (Latest Stable) |
| Framework | Spring Boot 3.x |
| Database | PostgreSQL |
| Build Tool | Gradle (Kotlin DSL) |
| Architecture | Layered (Controller → Service → Repository → Entity) |

---

## 🗄️ Data Model

### User Entity
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary Key |
| email | String | Unique, Not Null |
| password | String | Hashed |
| createdAt | LocalDateTime | |

### Transaction Entity
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary Key |
| userId | UUID | Foreign Key → User |
| amount | BigDecimal | Precision 19, Scale 2 |
| date | LocalDate | |
| category | String | e.g., "Food", "Rent" |
| description | String | |
| type | Enum | EXPENSE, INCOME |

### Budget Entity
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary Key |
| userId | UUID | Foreign Key → User |
| category | String | |
| limitAmount | BigDecimal | |
| period | String | e.g., "MONTHLY" |

---

## 🛣️ API Endpoints

### A. Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new user |
| POST | /api/auth/login | Validate credentials |

### B. Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions?userId=&startDate=&endDate=&category= | Get filtered transactions |
| POST | /api/transactions | Create new transaction |
| PUT | /api/transactions/{id} | Update transaction |
| DELETE | /api/transactions/{id} | Delete transaction |

### C. Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budgets?userId= | Get user's budgets |
| POST | /api/budgets | Create new budget |

### D. Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/summary?userId= | Get financial summary |

---

## 📁 Project Structure
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

## ✅ Acceptance Criteria
1. All entities properly mapped with JPA annotations
2. CRUD operations work for Transactions and Budgets
3. Reports endpoint returns aggregated data (total income, expenses, net savings, category breakdown)
4. Error handling returns consistent JSON responses
5. Application compiles without errors
6. Basic unit tests pass