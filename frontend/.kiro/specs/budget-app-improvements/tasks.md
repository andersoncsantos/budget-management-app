# Implementation Plan: budget-app-improvements

## Overview

Implement four major improvements to the existing React budget app: (1) React Router DOM v7 navigation with a persistent Navbar, (2) a full CRUD Expenses page with form validation and confirmation dialog, (3) an abstracted service layer with `LocalStorageAdapter` and `InMemoryAdapter`, and (4) a light/dark theme system plus enhanced analytics charts with category filtering.

The implementation follows a bottom-up order: data/service layer first, then context, then routing/layout, then pages and components, and finally tests.

---

## Tasks

- [x] 1. Set up testing infrastructure and install missing dev dependencies
  - Add `vitest`, `@vitest/coverage-v8`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` to `devDependencies` in `package.json`
  - Configure `vite.config.ts` with a `test` block: `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/setupTests.ts']`
  - Create `src/setupTests.ts` that imports `@testing-library/jest-dom`
  - _Requirements: 4.4 (InMemoryAdapter for tests), Testing Strategy_

- [x] 2. Define the service layer interface and Transaction type
  - [x] 2.1 Create `src/services/IBudgetService.ts`
    - Export the `Transaction` interface with fields: `id`, `valor`, `categoria`, `mes`, `data`, `descricao?`
    - Export the `IBudgetService` interface with all six methods: `getBudgetData`, `getTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction`, `updateMetadata`
    - _Requirements: 4.1_

- [x] 3. Implement the InMemoryAdapter
  - [x] 3.1 Create `src/services/InMemoryAdapter.ts`
    - Implement all `IBudgetService` methods using in-memory state only (no `localStorage`)
    - Implement `recalculate(affectedMonths)` logic: per-category monthly sums → "Gastos Total" → balance → annual totals
    - Accept optional `initialData` constructor parameter
    - _Requirements: 4.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Write property tests for InMemoryAdapter (Properties 2, 4, 5, 6, 7, 8, 9)
    - Create `src/services/__tests__/InMemoryAdapter.pbt.test.ts`
    - **Property 2: addTransaction increases list length by exactly 1** — Validates: Requirements 2.2
    - **Property 4: updateTransaction reflects all updated fields** — Validates: Requirements 2.9
    - **Property 5: deleteTransaction decreases list length by exactly 1** — Validates: Requirements 2.12
    - **Property 6: Category monthly values are consistent with transactions** — Validates: Requirements 3.1
    - **Property 7: "Gastos Total" is the sum of all other category values per month** — Validates: Requirements 3.2
    - **Property 8: Balance monthly value equals income plus total expenses per month** — Validates: Requirements 3.3
    - **Property 9: Annual total equals sum of twelve monthly values for every BudgetEntry** — Validates: Requirements 3.4, 3.5
    - Minimum 100 iterations per property

  - [x] 3.3 Write unit tests for InMemoryAdapter
    - Create `src/services/__tests__/InMemoryAdapter.test.ts`
    - Cover all CRUD methods with concrete examples
    - Cover recalculation after edit with month/category change
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Implement the LocalStorageAdapter
  - [x] 4.1 Create `src/services/LocalStorageAdapter.ts`
    - Implement all `IBudgetService` methods with `localStorage` persistence
    - Implement `load()`: parse JSON, validate required fields, fall back to `{ ...budgetData, transactions: [] }` with `console.warn` on failure
    - Implement `persist()`: call `localStorage.setItem`; propagate `QuotaExceededError` without mutating in-memory state (rollback pattern)
    - Implement `recalculate(affectedMonths)` — same logic as `InMemoryAdapter`
    - _Requirements: 4.3, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 4.2 Write unit tests for LocalStorageAdapter
    - Create `src/services/__tests__/LocalStorageAdapter.test.ts`
    - Test `QuotaExceededError` rollback: in-memory state unchanged after failed persist (Req 4.3, 7.6)
    - Test corrupted data recovery: falls back to default data and emits `console.warn` (Req 7.5)
    - Test missing data initialization: empty localStorage initializes with `budgetData` (Req 4.5)
    - Mock `localStorage` via `vi.stubGlobal`

  - [ ]* 4.3 Write property test for JSON serialization round-trip (Property 10)
    - Create `src/services/__tests__/serialization.pbt.test.ts`
    - **Property 10: JSON serialization round-trip preserves structural equivalence** — Validates: Requirements 7.3, 7.4
    - Minimum 100 iterations

- [ ] 5. Create the service factory and update BudgetContext
  - [ ] 5.1 Create `src/services/budgetServiceFactory.ts`
    - Export `createBudgetService()` that reads `import.meta.env.VITE_STORAGE_ADAPTER` and returns `InMemoryAdapter` or `LocalStorageAdapter`
    - _Requirements: 4.6_

  - [ ] 5.2 Rewrite `src/context/BudgetContext.tsx`
    - Replace static `budgetData` import with `createBudgetService()` via `useMemo`
    - Add `transactions: Transaction[]` to context value
    - Add `addTransaction`, `updateTransaction`, `deleteTransaction` mutations that call the service then refresh both `data` and `transactions` state
    - Update `getCategoryDistribution` to accept optional `selectedCategories?: string[]` parameter; compute percentages relative to visible categories only
    - Remove direct import of `budgetData.ts` from this file
    - _Requirements: 4.2, 3.6, 6.6_

  - [ ]* 5.3 Write integration test for BudgetContext
    - Create `src/__tests__/budgetContext.integration.test.ts`
    - Test that context propagates updated `data` and `transactions` after `addTransaction` (Req 3.6)
    - Test that KPI values re-render after mutation

- [ ] 6. Implement the ThemeContext
  - [ ] 6.1 Create `src/context/ThemeContext.tsx`
    - Implement `ThemeProvider` with `useState` initialized from `localStorage.getItem('theme')`, then `prefers-color-scheme`, then `'light'`
    - Implement `useEffect` that toggles `document.documentElement.classList` and persists to `localStorage`
    - Export `useTheme` hook
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write property test for ThemeContext (Property 11)
    - Create `src/context/__tests__/ThemeContext.pbt.test.ts`
    - **Property 11: toggleTheme always produces the opposite theme** — Validates: Requirements 5.2
    - Minimum 100 iterations

  - [ ]* 6.3 Write unit tests for ThemeContext
    - Create `src/context/__tests__/ThemeContext.test.ts`
    - Test saved preference restored on load (Req 5.5)
    - Test system preference fallback (Req 5.6)
    - Test persistence on toggle (Req 5.7)
    - Test sun icon shown in dark mode, moon icon in light mode (Req 5.8, 5.9)

- [ ] 7. Checkpoint — Ensure all service and context tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Set up routing and layout
  - [ ] 8.1 Create `src/router/index.tsx`
    - Define `createBrowserRouter` with routes: `"/"` → `RootLayout` with children `BudgetPage` (index), `"/despesas"` → `ExpensesPage`, and catch-all `"*"` → `<Navigate to="/" replace />`
    - _Requirements: 1.1, 1.2, 1.6_

  - [ ] 8.2 Create `src/components/layout/RootLayout.tsx`
    - Render `<Navbar />` and `<Outlet />` inside a full-height wrapper with `dark:bg-slate-900` Tailwind classes
    - _Requirements: 1.5_

  - [ ] 8.3 Create `src/components/layout/Navbar.tsx`
    - Render app title/logo on the left
    - Render `<NavLink to="/">` with label "Orçamento" and `<NavLink to="/despesas">` with label "Despesas"; apply active style via `className` callback
    - Render theme toggle button: sun icon when `theme === 'dark'`, moon icon when `theme === 'light'`; call `toggleTheme` on click
    - Read theme from `useTheme()`
    - _Requirements: 1.3, 1.4, 1.5, 1.9, 5.8, 5.9_

  - [ ] 8.4 Update `src/main.tsx`
    - Wrap app with `<ThemeProvider>`, `<BudgetProvider>`, and `<RouterProvider router={router} />`
    - Remove old `<App />` usage
    - _Requirements: 1.1, 5.1_

  - [ ]* 8.5 Write unit tests for routing
    - Create `src/router/__tests__/routing.test.ts`
    - Test `/` renders `BudgetPage` (Req 1.1)
    - Test `/despesas` renders `ExpensesPage` (Req 1.2)
    - Test unknown route redirects to `/` (Req 1.6)
    - Test active link receives active style class (Req 1.9)

- [ ] 9. Create the BudgetPage and adapt existing components for dark mode
  - [ ] 9.1 Create `src/pages/BudgetPage.tsx`
    - Extract the existing `App.tsx` JSX (header, KPI cards, `AnalyticsSection`, `BudgetTable`) into this new page component
    - _Requirements: 1.1_

  - [ ] 9.2 Adapt `src/components/budget/SummaryCard.tsx` for dark mode
    - Add `dark:` Tailwind variants to background, text, and border colors
    - _Requirements: 5.3, 5.4_

  - [ ] 9.3 Adapt `src/components/budget/BudgetTable.tsx` for dark mode
    - Add `dark:` Tailwind variants to table background, header, row, and text colors
    - _Requirements: 5.3, 5.4_

- [ ] 10. Implement the enhanced AnalyticsSection with CategoryFilter
  - [ ] 10.1 Create `src/components/budget/CategoryFilter.tsx`
    - Accept `categories: string[]`, `selected: string[]`, `onChange: (selected: string[]) => void`
    - Render toggle chips/checkboxes for each category; all selected by default
    - _Requirements: 6.7, 6.8_

  - [ ] 10.2 Update `src/components/budget/AnalyticsSection.tsx`
    - Add `selectedCategories` local state initialized to all categories
    - Add `LineChart` for monthly balance evolution with `CustomLineTooltip` (month + `formatBRL(saldo)`)
    - Update `BarChart` tooltip to `CustomBarTooltip` (month + `formatBRL(receitas)` + `formatBRL(despesas)`)
    - Update `PieChart` tooltip to `CustomPieTooltip` (name + `formatBRL(value)` + `percentage.toFixed(1)%` relative to visible categories)
    - Pass `selectedCategories` to `getCategoryDistribution`
    - Render `<CategoryFilter>` below charts
    - Apply dark mode chart colors per the design color table (grid lines, axis text, tooltip bg/text, line/bar colors)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [ ] 11. Implement the Expenses page components
  - [ ] 11.1 Create `src/components/expenses/ConfirmDialog.tsx`
    - Render as a React portal into `document.body`
    - Accept `message: string`, `onConfirm: () => void`, `onCancel: () => void`
    - Render modal overlay with confirm and cancel buttons
    - Apply dark mode styles
    - _Requirements: 2.11_

  - [ ] 11.2 Create `src/components/expenses/ExpenseItem.tsx`
    - Accept `transaction: Transaction`, `onEdit: (t: Transaction) => void`, `onDelete: (id: string) => void`
    - Display `data`, `categoria`, `mes`, `valor` (via `formatBRL`), `descricao` (truncated)
    - Render "Editar" and "Excluir" action buttons
    - Apply dark mode styles
    - _Requirements: 2.8, 2.11_

  - [ ] 11.3 Create `src/components/expenses/ExpenseList.tsx`
    - Read `transactions` from `useBudget()`
    - Sort by `data` descending before rendering
    - Render a list of `<ExpenseItem>` components
    - Apply dark mode styles
    - _Requirements: 2.1_

  - [ ]* 11.4 Write property test for ExpenseList sort order (Property 1)
    - Create `src/components/__tests__/ExpenseList.pbt.test.ts`
    - **Property 1: Transaction list is sorted by date descending** — Validates: Requirements 2.1
    - Minimum 100 iterations

  - [ ] 11.5 Create `src/components/expenses/ExpenseForm.tsx`
    - Accept `transaction?: Transaction` (edit mode when set) and `onCancel: () => void`
    - Manage local `FormState` with fields: `valor`, `categoria`, `mes`, `data`, `descricao`, `errors`
    - Populate fields from `transaction` prop when in edit mode
    - Validate on submit: `valor > 0 && valor <= 999_999_999.99`, non-empty `categoria`, valid `mes`, non-empty `data`, `descricao?.length <= 255`
    - Display inline error messages per the design error table
    - Clear individual field errors when the user modifies that field
    - Call `addTransaction` or `updateTransaction` from `useBudget()` on valid submit
    - Call `onCancel` and reset form on cancel
    - Apply dark mode styles
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 11.6 Write property test for ExpenseForm validation (Property 3)
    - Create `src/components/__tests__/ExpenseForm.pbt.test.ts`
    - **Property 3: Non-positive valor is rejected by form validation** — Validates: Requirements 2.4
    - Minimum 100 iterations

  - [ ]* 11.7 Write unit tests for ExpenseForm
    - Create `src/components/__tests__/ExpenseForm.test.ts`
    - Test empty `categoria` error message (Req 2.5)
    - Test missing `mes` error message (Req 2.6)
    - Test missing `data` error message (Req 2.7)
    - Test cancel resets form to creation mode (Req 2.10)
    - Test edit mode pre-fills all form fields (Req 2.8)

  - [ ]* 11.8 Write unit tests for ConfirmDialog
    - Create `src/components/__tests__/ConfirmDialog.test.ts`
    - Test confirm button triggers `onConfirm` callback (Req 2.11)
    - Test cancel button triggers `onCancel` callback and dismisses dialog (Req 2.11)

  - [ ] 11.9 Create `src/pages/ExpensesPage.tsx`
    - Manage `editingTransaction: Transaction | null` and `deletingId: string | null` state
    - Render `<ExpenseForm transaction={editingTransaction} onCancel={() => setEditing(null)} />`
    - Render `<ExpenseList onEdit={setEditing} onDelete={setDeletingId} />`
    - Render `<ConfirmDialog>` conditionally when `deletingId` is set; call `deleteTransaction` on confirm
    - Apply dark mode styles
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12_

- [ ] 12. Add utility helpers and create `src/utils/dateUtils.ts`
  - Create `src/utils/dateUtils.ts` with date formatting helpers used by `ExpenseItem` and `ExpenseForm`
  - _Requirements: 2.3_

- [ ] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Integration tests and localStorage persistence
  - [ ]* 14.1 Write integration test for localStorage persistence
    - Create `src/__tests__/localStorage.integration.test.ts`
    - Test data persists across simulated page reload (Req 7.1, 7.2)
    - Mock `localStorage` via `jsdom` built-in

- [ ] 15. Final cleanup and wiring
  - [ ] 15.1 Remove or repurpose `src/App.tsx`
    - Delete or empty `App.tsx` now that `BudgetPage` holds its content and `main.tsx` uses `RouterProvider`
    - Verify no orphaned imports remain
    - _Requirements: 4.2_

  - [ ] 15.2 Verify no component imports `budgetData.ts` directly
    - Search codebase for direct imports of `budgetData.ts` outside of `LocalStorageAdapter.ts` and `InMemoryAdapter.ts`; remove any found
    - _Requirements: 4.2_

- [ ] 16. Final checkpoint — Ensure all tests pass and app builds
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using **fast-check** with Vitest
- Unit tests validate specific examples and edge cases
- `InMemoryAdapter` is the default test double for all service-layer tests — no `localStorage` mocking needed
- The design uses TypeScript throughout; all code should be strictly typed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "4.3", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "9.1", "9.2", "9.3", "10.1", "12"] },
    { "id": 7, "tasks": ["8.5", "10.2", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["11.4", "11.5"] },
    { "id": 9, "tasks": ["11.6", "11.7", "11.8", "11.9"] },
    { "id": 10, "tasks": ["14.1", "15.1", "15.2"] }
  ]
}
```
