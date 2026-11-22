# ADR-001: Modernization Foundations, Stack Decisions, and Incremental Migration Strategy

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 1 (Safety Net, Characterization Tests & Foundations)

## Context
The `budget-app` portal is an existing React 19 + Vite 8 + TypeScript 6 single-page application for budget analysis, monthly matrix tracking, and bank statement management. Phase 0 discovery identified:
1. TypeScript `strict` mode and `noUncheckedIndexedAccess` were disabled in `tsconfig.app.json` and `tsconfig.node.json`.
2. 17 ESLint errors and 3 warnings across 7 files, including React 19 `react-hooks/set-state-in-effect` and `react-hooks/immutability` violations in `BudgetContext`, `AuthContext`, and `ImportModal`.
3. Floating-point money calculations and a seed data reconciliation discrepancy between individual March expense categories (`R$ 4.400,00`) and pre-computed `Gastos Total` (`-R$ 3.800,00`).
4. 0% test coverage on UI pages and components, with no feature-flag mechanism for reversible vertical-slice rollouts.

## Decisions
1. **Keep Vite 8 SPA + React 19.2.6 + TanStack Query v5 + React Router v7:**
   - The portal is an authenticated financial workspace served via Nginx/Docker against a REST backend (`/api`). Adopting Next.js / SSR adds server runtime complexity without user benefit.
2. **Enforce Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`):**
   - Enabled in both `tsconfig.app.json` and `tsconfig.node.json`. All unsafe indexed accesses and implicit types must be narrowed explicitly.
3. **Eliminate Synchronous `setState` in `useEffect` (React 19 Best Practices):**
   - Derived values (`useApi` in `BudgetContext`) are computed during render.
   - Initial persisted auth state (`AuthContext`) is read via lazy `useState` initialization rather than an effect-triggered re-render.
   - Modal state reset (`ImportModal`) uses component mount lifecycle (`ImportModalContent`) and direct async invocation rather than state-effect chains.
4. **Incremental Feature Flags (`src/shared/lib/featureFlags.ts`):**
   - Vertical slices (`domainMoneyReconciliation`, `modernDashboardSlice`, `modernDetailsSlice`, `modernStatementSlice`) are gated behind runtime (`localStorage` `ff:<flag>`) and build-time (`VITE_FF_<FLAG>`) flags so every phase is immediately reversible.
5. **Characterization Test Suite (`src/__tests__/characterization.test.tsx`):**
   - Captures golden outputs for offline `LocalStorageAdapter`, online `BudgetContext` rollups, and the three primary screens (`DashboardPage`, `BudgetDetailsPage`, `StatementPage`) before domain or UI refactoring begins.

## Alternatives Considered
- **Migrating to Next.js 16 App Router:** Rejected because the application is an authenticated internal/personal financial portal with an existing separate backend on port `8081` and static Nginx container deployment.
- **Big-bang rewrite of `BudgetContext` and pages:** Rejected per §1 ("Incremental over big-bang") and §12 ("Safety net first").

## Consequences
- Every subsequent phase starts from a zero-error strict TypeScript and ESLint baseline.
- Characterization tests guard against unintended regressions while Phase 2 extracts pure integer minor-unit (`centavos`) financial domain logic.
