# Budget App — Project Skill

## Project Overview

A personal finance / budget tracking React app built with Vite + TypeScript + Tailwind CSS. The app visualizes annual budget data (2026) with income, expense categories, and monthly balance tracking. UI language is **Brazilian Portuguese**.

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Routing | React Router DOM v7 |
| Currency | `Intl.NumberFormat` with `pt-BR` / `BRL` locale |

## Project Root

```
/home/anderson/Workspace/ai_react_app_test/budget-app/
```

## Key Source Files

| File | Purpose |
|---|---|
| `src/budgetData.ts` | Static budget data + TypeScript types (`BudgetData`, `BudgetEntry`, `Month`) |
| `src/context/BudgetContext.tsx` | React context providing budget data, month list, and helper functions |
| `src/App.tsx` | Root layout: header, KPI cards, analytics, budget table |
| `src/components/SummaryCard.tsx` | KPI card component |
| `src/components/BudgetTable.tsx` | Full-year budget breakdown table |
| `src/components/AnalyticsSection.tsx` | Recharts pie + bar charts |
| `src/utils/currency.ts` | `formatBRL` / `parseBRL` helpers |

## Data Model

```ts
type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

interface BudgetEntry {
  monthlyValues: Record<Month, number>;
  total: number;
}

interface BudgetData {
  metadata: { updatedDate: string; realBalance: number; spreadsheetBalance: number; currency: string };
  income: Record<string, BudgetEntry>;
  expenses: Record<string, BudgetEntry>;
  balance: BudgetEntry;
}
```

Expense values are **negative numbers**. Use `Math.abs()` when displaying them.

## Expense Categories (current)

Alimentação, Cartão de Crédito, Compras, Contas, Contas (Casa Erm.), Diversão, Farmácia, Gastos Extras, Tarifas Bancárias, Tom Penha, Investimentos

## Conventions

- All user-facing text is in **Brazilian Portuguese**
- Currency always formatted with `formatBRL()` from `src/utils/currency.ts`
- Tailwind utility classes only — no custom CSS files except `App.css` / `index.css`
- Components are functional React with explicit `React.FC` typing
- Context is the state management layer; no Redux or Zustand currently installed
- Routing is available via `react-router-dom` but not yet wired up (single-page app today)

## Current Limitations / Known Gaps

- Data is **hardcoded** in `budgetData.ts` — no API or persistence layer
- No routing / multi-page navigation yet (router installed but unused)
- No expense recording / CRUD — read-only view
- No theme switching (light mode only)
- `BudgetContext` uses `useMemo` but `calculateTotalForMonth` and `getCategoryDistribution` are recreated on every render (missing `useCallback`)
- The `budget-app/budget-app/src/` nested folder appears to be a leftover scaffold — ignore it

## Build & Dev Commands

Run from `/home/anderson/Workspace/ai_react_app_test/budget-app/`:

```bash
npm run dev       # start Vite dev server
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint
npm run preview   # preview production build
```
