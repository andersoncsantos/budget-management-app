# ADR-002: Financial Domain Module, Integer Minor-Unit Money Representation, and Reconciliation Invariants

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 2 (Financial Domain Module & Reconciliation)

## Context
Phase 0 discovery and Phase 1 characterization tests revealed:
1. All monetary values in `budget-app` were computed using raw IEEE-754 floating-point `number` arithmetic (`parseFloat`, `reduce((acc, v) => acc + v, 0)`), risking rounding drift.
2. In `src/budgetData.ts` (seed data), individual expense categories were stored as positive numbers while `Gastos Total` was stored as a negative number, whereas `InMemoryAdapter`, `LocalStorageAdapter`, and `BudgetContext` stored individual expense categories as negative numbers after recalculation.
3. Multiple rows in `src/budgetData.ts` had horizontal and vertical arithmetic inconsistencies (for example, March expense categories summed to `3,900` while `Gastos Total` was `-3,800`, and annual expense categories summed to `43,600` while `Gastos Total` was `-40,500`), causing the Dashboard to render a `"Data Inconsistency Detected"` alert banner in default/offline mode and causing KPI cards (`R$ 40.500,00`) to disagree with the charts and details table (`R$ 43.600,00`).

## Decisions
1. **Integer Minor Units (`Money` value object in `src/shared/lib/money.ts`):**
   - All monetary calculations operate on integer minor units (`amountMinor`, e.g., centavos for `BRL`) paired with an explicit `CurrencyCode` (`'BRL' | 'USD' | 'EUR'`).
   - Mixing currencies without an explicit conversion throws `CurrencyMismatchError`.
   - A single rounding policy (`roundToInteger` defaulting to `'half-even'` Banker's rounding, with `'half-up'` available) is used across all conversions and scalar multiplications.
   - Budget allocations across periods or weights use the **Largest-Remainder Method** (`allocateMoney`), proven by property-based tests (`fast-check`) to preserve `sum(parts) === total.amountMinor` down to the centavo.
2. **Pure Domain Modules (`src/features/budgets/domain/`):**
   - `rollups.ts`: Provides `reconcileBudgetData`, `calculateBudgetMatrixFromTransactions`, `calculateMonthlySummary`, `calculateCategoryDistribution`, `calculateMonthlyTrend`, and `calculateKpiSummary`.
   - `variance.ts`: Implements `variance = actual - budget` and `variancePercent = variance / |budget| * 100` in integer minor units, returning `variancePercent: null` and `formattedPercent: "n/a"` when `budget === 0` (never `Infinity` or `NaN`), and encoding favorable/unfavorable status according to line kind (`EXPENSE` vs `INCOME`).
   - `periods.ts`: Implements leap-year-aware calendar helpers (`isLeapYear`, `getDaysInMonth`), timezone-safe ISO date parsing (`parseISODateParts`), and year/quarter/month/YTD period filters.
3. **Single Source of Truth & Seed Data Reconciliation:**
   - Normalized `src/budgetData.ts` so all individual expense categories follow the negative sign convention (`<= 0`), every category's `.total` equals its 12-month sum, `Gastos Total` equals the exact sum of all expense categories (`-43,600` annual, `-3,900` March), and `balance` equals `income + Gastos Total` (`18,400` annual, `1,100` March).
   - Connected `BudgetContext.tsx`, `DashboardPage.tsx`, `AnalyticsSection.tsx`, `InMemoryAdapter.ts`, and `LocalStorageAdapter.ts` to the pure domain rollup functions.

## Alternatives Considered
- **Adding an external decimal library (`decimal.js` / `dinero.js`):** Rejected in favor of a lightweight, zero-dependency integer minor-unit `Money` module per §3.1 and §5.1, avoiding any bundle size increase while providing exact integer arithmetic and full TypeScript strictness.

## Consequences
- KPI cards, category distribution donut charts, monthly trend bar charts, and financial details tables are guaranteed to reconcile 100% (enforced by automated unit and `fast-check` property-based reconciliation tests in `src/features/budgets/domain/__tests__/reconciliation.test.ts`).
