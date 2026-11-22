# ADR-005: Vertical Slice 2 — Financial Details Matrix, Statement Data Grid, URL State & Export Security

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 5 (Vertical Slice 2 — Financial Details Matrix & Statement Data Grid)

## Context
Prior to Phase 5:
1. `BudgetDetailsPage.tsx` ignored URL period parameters (`?period=Q1`, `?period=Mar`), lacked column subtotals (`<tfoot>`), had no column sorting or comfortable/compact density toggle, and did not support privacy masking.
2. `StatementPage.tsx` stored search, category filter, date range, and pagination only in local component state (`useState`), lacked column sorting with `aria-sort`, had no filtered subtotal/grand-total footer (`<tfoot>`), used custom modal markup without focus trapping or programmatic `<label htmlFor>` bindings, and lacked a live region for mutation announcements.
3. CSV export in `StatementPage.tsx` concatenated raw fields without neutralizing formula injection (`=`, `+`, `-`, `@`), and PDF print export interpolated raw user strings into `document.write()` HTML without escaping entities (XSS risk).

## Decisions
1. **Export Security (`src/shared/lib/exportSanitizer.ts`, §8, §10.2):**
   - `sanitizeCsvCell` prefixes any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote `'` and escapes internal quotes (`""`).
   - `escapeHtml` and `buildSanitizedStatementPrintHtml` escape `&`, `<`, `>`, `"`, `'` across all transaction fields before generating printable HTML.
2. **Financial Details Matrix (`src/pages/BudgetDetailsPage.tsx`, §5.7, §6.2, §8):**
   - Connected to `usePortalUrlState()` so active period columns (`activeMonths`) and global search (`?q=...`) filter the matrix and compute row and column subtotals (`<tfoot>`) in integer minor units, reconciling 100% with `Saldo Final` and Dashboard KPI cards.
   - Added interactive `Categoria` and `Total` sorting (`aria-sort`), persisted `Confortável` / `Compacta` density toggle, semantic `<th scope="col|row">`, and `<MoneyDisplay>` cells.
3. **Statement Data Grid (`src/pages/StatementPage.tsx`, §3.1, §8, §9):**
   - Mirrored search (`?q=`), category (`?category=`), date range (`?start=&end=`), period (`?period=`), sort (`?sort=&dir=`), and page (`?page=`) in URL search params.
   - Added interactive column sorting (`Data`, `Categoria`, `Valor`) with `aria-sort`, integer minor-unit `Total Filtrado` footer (`<tfoot>`), persisted table density toggle, accessible row checkboxes, `<Dialog>` modals with programmatic form label associations, and an `aria-live="polite"` status region.

## Consequences
- Every table in the portal now reconciles with the active URL period/filter state, supports keyboard sorting and compact analyst density, and sanitizes all exported data against formula injection and XSS.
