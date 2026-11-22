# ADR-003: OKLCH Design Tokens, WCAG 2.2 AA Contrast, and Accessible UI/Chart Primitives

- **Status:** Accepted
- **Date:** 2026-04-12
- **Phase:** Phase 3 (Design System Tokens in OKLCH, App Shell & Accessibility Primitives)

## Context
Phase 0 discovery identified several accessibility and design-system gaps:
1. CSS tokens in `src/styles/tokens.css` were authored in hex/rgba and `--color-text-muted` had ~2.5:1 contrast against card surfaces in both Light and Dark themes (failing the WCAG 2.2 AA 4.5:1 minimum for text).
2. `MainLayout.tsx` lacked a skip-to-content link, programmatic labels on icon-only controls, global search with keyboard shortcut (`/` or `Cmd/Ctrl+K`), URL-synchronized period selector, and a user-remembered privacy toggle.
3. Charts had no accessible data-table alternative ("Ver como tabela") or unit/period subtitle.
4. Modals lacked focus trapping and focus restoration, and widgets lacked `<ErrorBoundary>` and layout-matched `<Skeleton>` primitives.

## Decisions
1. **OKLCH Design Tokens & WCAG 2.2 AA Contrast (`src/styles/tokens.css`, `src/index.css`):**
   - Migrated all semantic surface, text, border, accent (`primary`, `positive`, `negative`, `warning`, `info`, `neutral`), and 8-hue categorical chart tokens (`--color-chart-1` .. `--color-chart-8`) to OKLCH.
   - Adjusted `--color-text-muted` and `--color-text-placeholder` lightness values in both Light (`oklch(0.478 0.036 256.85)` -> 6.3:1 on white) and Dark (`oklch(0.765 0.028 255.5)` -> 6.2:1 on dark card) themes to exceed WCAG 2.2 AA 4.5:1 contrast.
   - Added `prefers-reduced-motion: reduce` media query rules.
2. **Accessible Primitives (`src/shared/ui/` & `src/shared/charts/`):**
   - `<MoneyDisplay>`: Enforces `tabular-nums`, exposes full precision values in `title` and `aria-label` when `compact` is enabled, and masks amounts (`R$ •••••`) when privacy mode is active.
   - `<KpiCard>`: Displays tabular numerals, comparison delta with direction icon (`▲`/`▼`/`—`), semantic tone, and screen-reader prefix (never color alone), plus accessible info tooltip and loading skeleton.
   - `<ChartCard>`: Wraps every chart with title, unit + period subtitle, loading/empty/error states, and a keyboard-operable `"Ver como tabela"` / `"Ver gráfico"` toggle (`aria-pressed`) rendering a semantic HTML `<table>`.
   - `<Dialog>`: Implements `role="dialog"`, `aria-modal="true"`, `Tab`/`Shift+Tab` focus trap, `Escape` close, and focus restoration.
   - `<ErrorBoundary>` & `<Skeleton>`: Provides widget-level fault isolation with retry and layout-matched skeletons.
3. **App Shell & URL State (`MainLayout.tsx`, `usePortalUrlState.ts`, `usePrivacyMask.ts`):**
   - Added skip-to-content link (`#main-content`), global search (`/` or `Cmd/Ctrl+K`), URL-mirrored period selector (`?period=YEAR|Q1..Q4|Jan..Dez`), and user-persisted privacy toggle (`localStorage` `budget-app:hide-amounts`).

## Consequences
- Vertical slices in Phases 4 and 5 can compose `<KpiCard>`, `<ChartCard>`, `<MoneyDisplay>`, `<Dialog>`, `usePortalUrlState`, and `usePrivacyMask` directly with built-in WCAG 2.2 AA compliance.
