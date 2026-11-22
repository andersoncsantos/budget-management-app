# ADR-004: Vertical Slice 1 — Dashboard & Analytics Modernization

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 4 (Vertical Slice 1 — Dashboard & Analytics Modernization)

## Context
Prior to Phase 4:
1. `DashboardPage.tsx` and `AnalyticsSection.tsx` were hardcoded to annual totals and ignored URL period filters.
2. KPI cards (`SummaryCard.tsx`) lacked comparison deltas, accessible calculation tooltips, and privacy masking.
3. The `Distribuição de Gastos` donut chart rendered all 11+ categories as individual slices (violating the ≤ 6 segment rule in §7.1 and Appendix B), had no center total label, no unit/period subtitle, and no accessible data-table alternative.
4. There was no category budget consumption progress view with non-color-only status indicators.

## Decisions
1. **URL-Driven Period Filtering & Reconciliation (`DashboardPage.tsx`, `AnalyticsSection.tsx`):**
   - Both components read `period`, `activeMonths`, and `periodLabel` from `usePortalUrlState()` (`?period=YEAR|Q1..Q4|Jan..Dez`).
   - All KPI totals, period-over-period deltas (`calculateDashboardComparison`), donut segments (`groupDonutDistribution`), monthly trend bars (`calculateMonthlyTrend`), and category consumption rows (`calculateCategoryConsumptionRows`) are computed from the same `activeMonths` slice in integer minor units.
2. **Chart Accessibility & Visual Standards (`AnalyticsSection.tsx`):**
   - Wrapped `Distribuição de Gastos` and `Tendência Mensal` in `<ChartCard>` with explicit unit and period subtitle (`BRL (R$) · <periodLabel>`) and `"Ver como tabela"` accessible HTML table toggles.
   - Capped the visual donut chart at 6 segments (top 5 categories + `"Outras Categorias"`) with the total spend centered inside the ring, while the accessible table view exposes all categories.
   - Set explicit zero-based Y-axis domain (`domain={[0, 'auto']}`) on `Tendência Mensal`.
3. **Non-Color-Only Category Progress & Variance Rows:**
   - Added the `Consumo por Categoria` section displaying category share progress bars (`role="progressbar"`), reference benchmark, and explicit icon + text + color variance badges (`Acima da referência`, `Abaixo da referência`, `Dentro da referência`), plus a period-preserving drill-down link to `/details`.

## Consequences
- Dashboard cards, chart rings/bars, accessible chart tables, and category progress rows always reconcile for any URL period filter.
