# ADR-006: Route & Library Code Splitting, Bundled PDF Worker, and Boundary Validation

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 6 (Performance Hardening, Code Splitting & Final Quality Audit)

## Context
Phase 0 discovery recorded a single monolithic `1,188.98 KB` (`340.3 KB` gzip) initial JavaScript bundle because all route screens (`DashboardPage`, `BudgetDetailsPage`, `StatementPage`, `LoginPage`) and heavy file-parsing dependencies (`pdfjs-dist`, `papaparse`, `recharts`) were eagerly bundled into the entry chunk. Additionally:
1. `ImportService.ts` loaded `pdf.worker.min.js` from an external protocol-relative CDN (`//cdnjs.cloudflare.com/...`).
2. `ApiClient.ts` and `LocalStorageAdapter.ts` cast parsed JSON directly without runtime boundary validation.
3. Unreferenced legacy files (`BudgetInputPage.tsx`, `BudgetTable.tsx`, `DebugExpenses.tsx`, `SummaryCard.tsx`, `ApiBudgetService.ts`, `tailwind.config.js`, and CLI debug scripts) remained in the source tree.

## Decisions
1. **Route-Level Code Splitting (`src/App.tsx`, §4.2, §10.1):**
   - Converted `DashboardPage`, `BudgetDetailsPage`, `StatementPage`, and `LoginPage` to `React.lazy()` imports wrapped in `<Suspense>` with layout-matched `<CardSkeleton>` and `<ChartSkeleton>` fallbacks.
   - Configured `QueryClient` default `staleTime` (`60s`) to prevent redundant refetch waterfalls.
2. **On-Demand Import of Heavy Parsing Libraries & Local PDF Worker (`src/services/ImportService.ts`, §10.1, §10.2):**
   - Changed `papaparse` and `pdfjs-dist` from top-level static imports to dynamic `import('papaparse')` inside `parseCSV()` and `import('pdfjs-dist')` inside `parsePDF()`.
   - Replaced the external CloudFlare CDN worker URL with a local Vite asset URL (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`).
3. **Runtime Boundary Validation (`src/shared/lib/validators.ts`, §3.1, §10.2, §13.3):**
   - Added strict `unknown`-narrowing validators (`parseAuthResponse`, `parseTransactionResponse`, `parseTransactionResponseList`, `parseCategoryResponse`, `parseCategoryResponseList`, `parseTransactionBatchResponse`, `parseMetadataResponse`, `validateStoredBudgetPayload`) and wired them into `ApiClient.ts` and `LocalStorageAdapter.ts`.
4. **Dead Code Removal (§12.6):**
   - Removed unused legacy components and CLI scripts from `src/`.

## Consequences
- `pdfjs-dist` and `papaparse` are only downloaded when a user initiates a CSV or PDF import.
- Initial route JS payload is split across route and vendor chunks, and external API/storage responses are validated at the trust boundary.
