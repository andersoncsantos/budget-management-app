# Design Document — budget-app-improvements

## Overview

Este documento descreve a arquitetura técnica para as melhorias do aplicativo de orçamento React.
As mudanças introduzem: roteamento com React Router DOM v7, uma página de despesas com CRUD completo,
uma camada de serviço abstraída com adaptadores intercambiáveis, um sistema de temas claro/escuro e
gráficos aprimorados com filtros interativos e suporte a dark mode.

A abordagem central é separar responsabilidades em três camadas:

1. **Camada de dados** — `IBudgetService` + adaptadores (`LocalStorageAdapter`, `InMemoryAdapter`)
2. **Camada de estado** — `BudgetContext` e `ThemeContext` (React Context + hooks)
3. **Camada de apresentação** — componentes React organizados por página

Nenhum backend é necessário; o `LocalStorageAdapter` é o padrão de produção.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          main.tsx                               │
│  createBrowserRouter  ──►  RouterProvider                       │
│                                │                                │
│                         ThemeProvider                           │
│                                │                                │
│                         BudgetProvider                          │
│                                │                                │
│                    ┌───────────┴───────────┐                    │
│                    │                       │                    │
│              Route "/"              Route "/despesas"           │
│           BudgetPage              ExpensesPage                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
│                                                                 │
│   IBudgetService (interface)                                    │
│        ├── LocalStorageAdapter  (VITE_STORAGE_ADAPTER=localStorage) │
│        └── InMemoryAdapter      (VITE_STORAGE_ADAPTER=memory)   │
│                                                                 │
│   createBudgetService(env) → IBudgetService   (factory)         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
RouterProvider
└── ThemeProvider
    └── BudgetProvider (holds IBudgetService instance)
        └── RootLayout
            ├── Navbar
            └── <Outlet>
                ├── BudgetPage  (route "/")
                │   ├── SummaryCard (×3)
                │   ├── AnalyticsSection
                │   │   ├── LineChart (saldo mensal)
                │   │   ├── BarChart (receitas vs despesas)
                │   │   ├── PieChart/donut (distribuição)
                │   │   └── CategoryFilter
                │   └── BudgetTable
                └── ExpensesPage  (route "/despesas")
                    ├── ExpenseForm
                    ├── ExpenseList
                    │   └── ExpenseItem (×n)
                    └── ConfirmDialog (portal)
```

---

## New File / Folder Structure

```
src/
  main.tsx                          — monta RouterProvider + ThemeProvider + BudgetProvider
  App.css / index.css
  budgetData.ts                     — dados iniciais (somente leitura; importado apenas pelos adaptadores)

  router/
    index.tsx                       — createBrowserRouter, rotas e catch-all

  context/
    BudgetContext.tsx                — BudgetProvider, useBudget
    ThemeContext.tsx                 — ThemeProvider, useTheme

  services/
    IBudgetService.ts               — interface TypeScript + tipo Transaction
    LocalStorageAdapter.ts          — implementação com localStorage
    InMemoryAdapter.ts              — implementação em memória
    budgetServiceFactory.ts         — createBudgetService(env) → IBudgetService

  pages/
    BudgetPage.tsx                  — página principal (KPIs + gráficos + tabela)
    ExpensesPage.tsx                — página de despesas (form + lista)

  components/
    layout/
      RootLayout.tsx                — wrapper com Navbar + <Outlet>
      Navbar.tsx                    — barra de navegação persistente + botão de tema
    budget/
      SummaryCard.tsx               — KPI card (existente, adaptado para dark mode)
      BudgetTable.tsx               — tabela de orçamento (existente, adaptado)
      AnalyticsSection.tsx          — gráficos aprimorados
      CategoryFilter.tsx            — filtro de categorias para o donut chart
    expenses/
      ExpenseForm.tsx               — formulário de criação/edição
      ExpenseList.tsx               — lista de transações
      ExpenseItem.tsx               — linha individual da lista
      ConfirmDialog.tsx             — modal de confirmação de exclusão

  utils/
    currency.ts                     — formatBRL / parseBRL (existente)
    dateUtils.ts                    — helpers de formatação de data
```

---

## Data Models

### Existing Types (unchanged)

```typescript
// src/budgetData.ts
export type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun'
                  | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

export interface BudgetEntry {
  monthlyValues: Record<Month, number>;
  total: number;
}

export interface BudgetMetadata {
  updatedDate: string;
  realBalance: number;
  spreadsheetBalance: number;
  currency: string;
}

export interface BudgetData {
  metadata: BudgetMetadata;
  income: Record<string, BudgetEntry>;
  expenses: Record<string, BudgetEntry>;  // inclui "Gastos Total"
  balance: BudgetEntry;
}
```

### New Type: Transaction

```typescript
// src/services/IBudgetService.ts
export interface Transaction {
  id: string;           // UUID v4 gerado pelo adaptador
  valor: number;        // positivo, em BRL (ex.: 150.00)
  categoria: string;    // nome da categoria (ex.: "Alimentação")
  mes: Month;           // mês ao qual a transação pertence
  data: string;         // ISO 8601 date string (ex.: "2026-01-15")
  descricao?: string;   // texto livre, máx. 255 caracteres
}
```

### Invariants

- `Transaction.valor > 0` — valores são sempre positivos; a subtração do saldo é responsabilidade do serviço.
- `expenses["Gastos Total"].monthlyValues[m]` = soma negativa de todas as outras categorias no mês `m`.
- `expenses[cat].monthlyValues[m]` = soma negativa de todos os `Transaction.valor` onde `categoria === cat && mes === m`.
- `balance.monthlyValues[m]` = `income total for m` + `expenses["Gastos Total"].monthlyValues[m]`.
- `entry.total` = soma dos 12 `entry.monthlyValues` para qualquer `BudgetEntry`.

---

## Components and Interfaces

### Service Layer

#### `IBudgetService` Interface

```typescript
// src/services/IBudgetService.ts
export interface IBudgetService {
  getBudgetData(): BudgetData;
  getTransactions(): Transaction[];
  addTransaction(t: Omit<Transaction, 'id'>): Transaction;
  updateTransaction(id: string, t: Partial<Omit<Transaction, 'id'>>): Transaction;
  deleteTransaction(id: string): void;
  updateMetadata(m: Partial<BudgetMetadata>): BudgetMetadata;
}
```

#### `LocalStorageAdapter`

```typescript
// src/services/LocalStorageAdapter.ts
const STORAGE_KEY = 'budget-app-data';

export class LocalStorageAdapter implements IBudgetService {
  private state: BudgetData & { transactions: Transaction[] };

  constructor() {
    this.state = this.load();
  }

  private load(): BudgetData & { transactions: Transaction[] } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('empty');
      const parsed = JSON.parse(raw);
      if (!parsed.metadata || !parsed.income || !parsed.expenses || !parsed.balance) {
        throw new Error('missing required fields');
      }
      return parsed;
    } catch (e) {
      console.warn('[LocalStorageAdapter] Dados inválidos ou ausentes; usando dados padrão.', e);
      return { ...budgetData, transactions: [] };
    }
  }

  private persist(): void {
    // Throws QuotaExceededError — propagated to caller without mutating in-memory state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private recalculate(affectedMonths: Month[]): void {
    // Recalculates category totals, "Gastos Total", balance, and annual totals
    // for the given months based on current transactions
  }

  getBudgetData(): BudgetData { /* returns copy of this.state */ }
  getTransactions(): Transaction[] { /* returns copy of this.state.transactions */ }
  addTransaction(t: Omit<Transaction, 'id'>): Transaction { /* generates id, pushes, recalculates, persists */ }
  updateTransaction(id: string, t: Partial<Omit<Transaction, 'id'>>): Transaction { /* merges, recalculates old+new months, persists */ }
  deleteTransaction(id: string): void { /* removes, recalculates, persists */ }
  updateMetadata(m: Partial<BudgetMetadata>): BudgetMetadata { /* merges, persists */ }
}
```

**Recalculation logic** (inside `recalculate(affectedMonths)`):

For each affected month `m`:
1. For each expense category (excluding "Gastos Total"): sum all `Transaction.valor` where `mes === m && categoria === cat`; store as negative value.
2. Recalculate "Gastos Total" for `m` as the sum of all category values for `m`.
3. Recalculate `balance.monthlyValues[m]` = income total for `m` + `expenses["Gastos Total"].monthlyValues[m]`.
4. After all months: recalculate `entry.total` for every modified entry as sum of 12 monthly values.

#### `InMemoryAdapter`

```typescript
// src/services/InMemoryAdapter.ts
// Identical logic to LocalStorageAdapter but without localStorage calls.
// Used in tests via VITE_STORAGE_ADAPTER=memory.
export class InMemoryAdapter implements IBudgetService {
  private state: BudgetData & { transactions: Transaction[] };
  constructor(initialData?: BudgetData) {
    this.state = { ...(initialData ?? budgetData), transactions: [] };
  }
  // Same methods as LocalStorageAdapter, minus persist()
}
```

#### `budgetServiceFactory`

```typescript
// src/services/budgetServiceFactory.ts
export function createBudgetService(): IBudgetService {
  const adapter = import.meta.env.VITE_STORAGE_ADAPTER ?? 'localStorage';
  if (adapter === 'memory') return new InMemoryAdapter();
  return new LocalStorageAdapter();
}
```

### `BudgetContext`

```typescript
// src/context/BudgetContext.tsx
interface BudgetContextValue {
  data: BudgetData;
  transactions: Transaction[];
  months: Month[];
  // Derived helpers
  calculateTotalForMonth: (month: Month) => { income: number; expenses: number; balance: number };
  getCategoryDistribution: (selectedCategories?: string[]) => CategoryDistributionItem[];
  // Mutations — delegate to service, then update state
  addTransaction: (t: Omit<Transaction, 'id'>) => Transaction;
  updateTransaction: (id: string, t: Partial<Omit<Transaction, 'id'>>) => Transaction;
  deleteTransaction: (id: string) => void;
}

interface CategoryDistributionItem {
  name: string;
  value: number;       // absolute value in BRL
  percentage: number;  // relative to sum of visible categories
}

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const service = useMemo(() => createBudgetService(), []);
  const [data, setData] = useState<BudgetData>(() => service.getBudgetData());
  const [transactions, setTransactions] = useState<Transaction[]>(() => service.getTransactions());

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    const created = service.addTransaction(t);
    setData(service.getBudgetData());
    setTransactions(service.getTransactions());
    return created;
  }, [service]);

  // updateTransaction and deleteTransaction follow the same pattern

  // ...
};
```

**Key design decisions:**
- The service instance is created once via `useMemo` and never recreated.
- Every mutation calls the service method, then refreshes both `data` and `transactions` from the service — this ensures all consumers re-render with consistent state.
- `getCategoryDistribution` accepts an optional `selectedCategories` array; when provided, percentages are calculated relative to the sum of selected categories only (Requirement 6.6).

### `ThemeContext`

```typescript
// src/context/ThemeContext.tsx
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
```

### Routing

```typescript
// src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { BudgetPage } from '../pages/BudgetPage';
import { ExpensesPage } from '../pages/ExpensesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <BudgetPage /> },
      { path: 'despesas', element: <ExpensesPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```

```typescript
// src/main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BudgetProvider>
        <RouterProvider router={router} />
      </BudgetProvider>
    </ThemeProvider>
  </StrictMode>
);
```

### `RootLayout` and `Navbar`

```typescript
// src/components/layout/RootLayout.tsx
export const RootLayout: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
    <Navbar />
    <main className="max-w-7xl mx-auto p-4 md:p-8">
      <Outlet />
    </main>
  </div>
);
```

```typescript
// src/components/layout/Navbar.tsx
// Props: none — reads from ThemeContext
// Renders:
//   - App title / logo (left)
//   - NavLink to "/" with label "Orçamento"
//   - NavLink to "/despesas" with label "Despesas"
//   - Theme toggle button (Sun icon when dark, Moon icon when light)
//
// NavLink active style: applied via className callback from React Router
// Example: className={({ isActive }) => isActive ? 'border-b-2 border-blue-500 ...' : '...'}
```

### `ExpensesPage`, `ExpenseForm`, `ExpenseList`, `ConfirmDialog`

```typescript
// src/pages/ExpensesPage.tsx
// State:
//   editingTransaction: Transaction | null  — null = creation mode
//   deletingId: string | null               — controls ConfirmDialog visibility
//
// Renders:
//   <ExpenseForm transaction={editingTransaction} onCancel={() => setEditing(null)} />
//   <ExpenseList onEdit={setEditing} onDelete={setDeletingId} />
//   {deletingId && <ConfirmDialog onConfirm={handleDelete} onCancel={() => setDeletingId(null)} />}
```

```typescript
// src/components/expenses/ExpenseForm.tsx
// Props:
//   transaction?: Transaction   — when set, form is in edit mode
//   onCancel: () => void
//
// Local state: FormState { valor, categoria, mes, data, descricao, errors }
// Validation rules:
//   valor: must be > 0 and <= 999_999_999.99
//   categoria: must be non-empty
//   mes: must be a valid Month
//   data: must be a non-empty valid date string
//   descricao: optional, max 255 chars
//
// On submit: calls addTransaction or updateTransaction from BudgetContext
```

```typescript
// src/components/expenses/ExpenseList.tsx
// Reads transactions from BudgetContext
// Sorts by data descending before rendering
// Renders a list of ExpenseItem components

// src/components/expenses/ExpenseItem.tsx
// Props: transaction, onEdit, onDelete
// Displays: data, categoria, mes, valor (formatBRL), descricao (truncated)
// Action buttons: "Editar", "Excluir"

// src/components/expenses/ConfirmDialog.tsx
// Rendered as a React portal into document.body
// Props: message, onConfirm, onCancel
// Displays a modal overlay with confirm/cancel buttons
```

### `AnalyticsSection` (updated)

```typescript
// src/components/budget/AnalyticsSection.tsx
// Local state:
//   selectedCategories: string[]  — initialized to all categories on mount
//
// Renders three charts in a responsive grid:
//
// 1. LineChart — saldo mensal
//    data: months.map(m => ({ name: m, Saldo: data.balance.monthlyValues[m] }))
//    Tooltip: CustomLineTooltip — shows month + formatBRL(saldo)
//
// 2. BarChart — receitas vs despesas
//    data: months.map(m => ({ name: m, Receitas: income[m], Despesas: abs(expenses[m]) }))
//    Tooltip: CustomBarTooltip — shows month + formatBRL(receitas) + formatBRL(despesas)
//
// 3. PieChart (donut) — distribuição por categoria
//    data: getCategoryDistribution(selectedCategories)
//    Tooltip: CustomPieTooltip — shows name + formatBRL(value) + percentage.toFixed(1)%
//
// 4. CategoryFilter — checkboxes for each category
//    onChange: updates selectedCategories state

// src/components/budget/CategoryFilter.tsx
// Props:
//   categories: string[]
//   selected: string[]
//   onChange: (selected: string[]) => void
// Renders a row of toggle chips/checkboxes
```

**Dark mode chart colors** (meeting 4.5:1 contrast on `bg-slate-800`):

| Role | Light mode | Dark mode |
|---|---|---|
| Grid lines | `#e2e8f0` | `#334155` |
| Axis text | `#64748b` | `#94a3b8` |
| Tooltip bg | `#ffffff` | `#1e293b` |
| Tooltip text | `#0f172a` | `#f1f5f9` |
| Positive line | `#10b981` | `#34d399` |
| Negative bar | `#ef4444` | `#f87171` |

---

## Data Flow Diagrams

### Mutation Flow (add/edit/delete transaction)

```
User action (ExpenseForm submit / ConfirmDialog confirm)
    │
    ▼
BudgetContext.addTransaction(t) / updateTransaction / deleteTransaction
    │
    ▼
IBudgetService.addTransaction(t)
    ├── Generates UUID
    ├── Pushes to this.state.transactions
    ├── Calls recalculate([affected months])
    │       ├── Recomputes category monthlyValues
    │       ├── Recomputes "Gastos Total" monthlyValues
    │       ├── Recomputes balance.monthlyValues
    │       └── Recomputes all .total fields
    └── Calls persist() → localStorage.setItem(...)
    │
    ▼
BudgetContext updates React state:
    setData(service.getBudgetData())
    setTransactions(service.getTransactions())
    │
    ▼
All consumers re-render:
    BudgetPage (KPIs, charts, table)
    ExpensesPage (transaction list)
```

### Theme Flow

```
User clicks theme toggle button (Navbar)
    │
    ▼
ThemeContext.toggleTheme()
    │
    ▼
setTheme(prev => prev === 'light' ? 'dark' : 'light')
    │
    ▼
useEffect fires:
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', newTheme)
    │
    ▼
Tailwind dark: variants activate / deactivate across all components
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is well-suited for property-based testing. The service layer (`InMemoryAdapter` / `LocalStorageAdapter`) contains pure data-transformation logic (recalculation, aggregation, serialization) that can be exercised with randomly generated inputs. The PBT library chosen is **fast-check** (TypeScript-native, works with Vitest).

Before listing properties, redundancies were eliminated:

- Requirements 3.4 and 3.5 both assert `entry.total = sum(monthlyValues)` — one combined property covers both.
- Requirements 7.3 and 7.4 both describe the JSON round-trip invariant — merged into one property.
- Requirements 3.1 and 3.2 test different aggregation levels (category vs. "Gastos Total") but share the same test setup; they are kept separate because they validate distinct invariants.

---

### Property 1: Transaction list is sorted by date descending

*For any* non-empty list of transactions with varying dates, the list returned by `getTransactions()` after being sorted for display SHALL have each transaction's `data` field greater than or equal to the next transaction's `data` field (lexicographic ISO 8601 comparison).

**Validates: Requirements 2.1**

---

### Property 2: addTransaction increases list length by exactly 1

*For any* valid transaction input (valor > 0, non-empty categoria, valid mes, non-empty data), calling `addTransaction` on a service instance with N transactions SHALL result in `getTransactions()` returning N + 1 transactions, and the returned transaction SHALL be present in the list.

**Validates: Requirements 2.2**

---

### Property 3: Non-positive valor is rejected by form validation

*For any* number that is zero or negative (including very large negative values and -0), the form validation function SHALL return a validation error containing the message "O valor deve ser maior que zero" and SHALL NOT create a transaction.

**Validates: Requirements 2.4**

---

### Property 4: updateTransaction reflects all updated fields

*For any* existing transaction and any valid partial update (subset of fields: valor, categoria, mes, data, descricao), calling `updateTransaction(id, patch)` SHALL return a transaction where every field present in `patch` equals the patched value, and every field absent from `patch` retains its original value.

**Validates: Requirements 2.9**

---

### Property 5: deleteTransaction decreases list length by exactly 1

*For any* service instance with N ≥ 1 transactions, calling `deleteTransaction(id)` for a valid existing id SHALL result in `getTransactions()` returning N − 1 transactions, and no transaction with the deleted id SHALL appear in the resulting list.

**Validates: Requirements 2.12**

---

### Property 6: Category monthly values are consistent with transactions

*For any* set of transactions and any expense category `cat` and month `m`, `expenses[cat].monthlyValues[m]` SHALL equal the negative sum of all `Transaction.valor` where `transaction.categoria === cat && transaction.mes === m`. If no transactions match, the value SHALL be 0.

**Validates: Requirements 3.1**

---

### Property 7: "Gastos Total" is the sum of all other category values per month

*For any* month `m`, `expenses["Gastos Total"].monthlyValues[m]` SHALL equal the sum of `expenses[cat].monthlyValues[m]` for all categories `cat` where `cat !== "Gastos Total"`.

**Validates: Requirements 3.2**

---

### Property 8: Balance monthly value equals income plus total expenses per month

*For any* month `m`, `balance.monthlyValues[m]` SHALL equal the sum of all income category values for `m` plus `expenses["Gastos Total"].monthlyValues[m]`.

**Validates: Requirements 3.3**

---

### Property 9: Annual total equals sum of twelve monthly values for every BudgetEntry

*For any* `BudgetEntry` (income category, expense category, or balance), `entry.total` SHALL equal the arithmetic sum of all twelve values in `entry.monthlyValues`. This invariant holds after every mutation (add, update, delete transaction).

**Validates: Requirements 3.4, 3.5**

---

### Property 10: JSON serialization round-trip preserves structural equivalence

*For any* valid `BudgetData` object, `JSON.parse(JSON.stringify(data))` SHALL produce an object that is deeply equal to the original — same keys at every level, same numeric values (no precision loss for values representable as IEEE 754 doubles), and same string values.

**Validates: Requirements 7.3, 7.4**

---

### Property 11: toggleTheme always produces the opposite theme

*For any* current theme value (`'light'` or `'dark'`), calling `toggleTheme()` SHALL change the theme to the other value. Calling `toggleTheme()` twice in succession SHALL restore the original theme (round-trip).

**Validates: Requirements 5.2**

---

## Error Handling

### Service Layer Errors

#### `LocalStorageAdapter` — Storage Quota Exceeded

When `localStorage.setItem` throws a `QuotaExceededError` (or any `DOMException` with `name === 'QuotaExceededError'`), the adapter SHALL:

1. **Not mutate** the in-memory `this.state` — the mutation is rolled back before `persist()` is called, or the in-memory state is restored if the error occurs after mutation.
2. **Re-throw** the original error so the caller (BudgetContext) can handle it.
3. **Not corrupt** previously persisted data — the failed `setItem` call leaves the existing localStorage entry intact.

```typescript
// Pattern used in LocalStorageAdapter
addTransaction(t: Omit<Transaction, 'id'>): Transaction {
  const created = { ...t, id: crypto.randomUUID() };
  this.state.transactions.push(created);
  this.recalculate([t.mes]);
  try {
    this.persist();
  } catch (e) {
    // Roll back in-memory mutation
    this.state.transactions.pop();
    this.recalculate([t.mes]);
    throw e;
  }
  return created;
}
```

#### `LocalStorageAdapter` — Corrupted or Missing Data

When `localStorage.getItem` returns `null` or a string that cannot be parsed as valid JSON, or when the parsed object is missing any of the required top-level fields (`metadata`, `income`, `expenses`, `balance`), the adapter SHALL:

1. Emit `console.warn` with a descriptive message (only in this situation — not on every load).
2. Initialize `this.state` with `{ ...budgetData, transactions: [] }` (the static default data).
3. Continue normally — no error is thrown to the caller.

#### `InMemoryAdapter` — No Persistence Errors

The `InMemoryAdapter` has no I/O and therefore no storage-related errors. All methods are synchronous and infallible (assuming valid inputs).

### Form Validation Errors

The `ExpenseForm` component performs client-side validation before calling any service method. Validation errors are displayed inline next to the relevant field and prevent form submission.

| Field | Condition | Error message |
|---|---|---|
| `valor` | `valor <= 0` or `valor > 999_999_999.99` | "O valor deve ser maior que zero" |
| `categoria` | empty string or whitespace-only | "Selecione ou informe uma categoria" |
| `mes` | not a valid `Month` value | "Selecione o mês da despesa" |
| `data` | empty string or invalid date | "Informe a data da despesa" |
| `descricao` | length > 255 characters | "A descrição deve ter no máximo 255 caracteres" |

Validation runs on submit. Individual field errors are cleared when the user modifies the corresponding field.

### BudgetContext — Propagating Service Errors

When a service method throws (e.g., `QuotaExceededError`), `BudgetContext` SHALL:

1. **Not update** React state (`setData` / `setTransactions` are not called).
2. **Re-throw** the error so the calling component can display a user-facing error message.
3. The UI SHALL display a non-blocking error notification (e.g., a toast or inline alert) informing the user that the operation failed and their data was not saved.

### Routing — Unknown Routes

Any route not matching `/` or `/despesas` is caught by the catch-all route and redirected to `/` via `<Navigate to="/" replace />`. No error page is shown; the redirect is silent.

### Theme Initialization — Missing or Invalid localStorage Value

If `localStorage.getItem('theme')` returns a value that is neither `'light'` nor `'dark'` (e.g., `null`, `undefined`, or a corrupted string), `ThemeProvider` falls back to `prefers-color-scheme` detection, then to `'light'`. No error is thrown or logged.

---

## Testing Strategy

### Overview

The testing strategy uses a dual approach:

- **Unit / property-based tests** — verify pure logic in the service layer and utility functions using `InMemoryAdapter` as the test double for `LocalStorageAdapter`.
- **Component tests** — verify UI behavior, form validation, and context integration using React Testing Library.
- **Integration tests** — verify end-to-end flows (routing, context propagation, localStorage persistence) with a small number of representative examples.

No backend exists, so there are no API integration tests.

### Test Framework and Libraries

| Tool | Purpose |
|---|---|
| **Vitest** | Test runner (native Vite integration, ESM support) |
| **fast-check** | Property-based testing library |
| **@testing-library/react** | Component rendering and interaction |
| **@testing-library/user-event** | Simulating user interactions |
| **jsdom** | DOM environment for Vitest |

Add to `devDependencies`:

```json
"@testing-library/react": "^16.x",
"@testing-library/user-event": "^14.x",
"@testing-library/jest-dom": "^6.x",
"fast-check": "^3.x",
"vitest": "^3.x",
"@vitest/coverage-v8": "^3.x"
```

### Property-Based Tests

Each property from the Correctness Properties section is implemented as a single `it.prop` test (fast-check + Vitest integration). Each test runs a minimum of **100 iterations**.

Tag format in test comments: `Feature: budget-app-improvements, Property N: <property_text>`

```typescript
// Example — Property 2: addTransaction increases list length by 1
// Feature: budget-app-improvements, Property 2: addTransaction increases list length by exactly 1
it.prop([fc.record({
  valor: fc.float({ min: 0.01, max: 999_999_999.99, noNaN: true }),
  categoria: fc.constantFrom('Alimentação', 'Contas', 'Compras', 'Farmácia'),
  mes: fc.constantFrom('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'),
  data: fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
         .map(d => d.toISOString().slice(0, 10)),
  descricao: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
})])('addTransaction increases list length by 1', (t) => {
  const service = new InMemoryAdapter();
  const before = service.getTransactions().length;
  const created = service.addTransaction(t);
  const after = service.getTransactions();
  expect(after).toHaveLength(before + 1);
  expect(after.find(tx => tx.id === created.id)).toBeDefined();
});
```

**Properties to implement as PBT tests:**

| Test file | Properties covered |
|---|---|
| `src/services/__tests__/InMemoryAdapter.pbt.test.ts` | Properties 2, 4, 5, 6, 7, 8, 9 |
| `src/services/__tests__/serialization.pbt.test.ts` | Property 10 |
| `src/context/__tests__/ThemeContext.pbt.test.ts` | Property 11 |
| `src/components/__tests__/ExpenseList.pbt.test.ts` | Property 1 |
| `src/components/__tests__/ExpenseForm.pbt.test.ts` | Property 3 |

### Unit Tests (Example-Based)

Unit tests cover specific behaviors, edge cases, and error conditions that are not universal properties:

| Test file | Scenarios covered |
|---|---|
| `src/services/__tests__/LocalStorageAdapter.test.ts` | QuotaExceededError rollback (Req 4.3, 7.6), corrupted data recovery (Req 7.5), missing data initialization (Req 4.5) |
| `src/services/__tests__/InMemoryAdapter.test.ts` | All CRUD methods with concrete examples, recalculation after edit with month change |
| `src/components/__tests__/ExpenseForm.test.ts` | Empty categoria error (Req 2.5), missing mes error (Req 2.6), missing data error (Req 2.7), cancel resets form (Req 2.10), edit mode pre-fills form (Req 2.8) |
| `src/components/__tests__/ConfirmDialog.test.ts` | Confirm triggers delete, cancel dismisses dialog (Req 2.11) |
| `src/context/__tests__/ThemeContext.test.ts` | Saved preference restored on load (Req 5.5), system preference fallback (Req 5.6), persistence on toggle (Req 5.7), icon display (Req 5.8, 5.9) |
| `src/router/__tests__/routing.test.ts` | Route `/` renders BudgetPage (Req 1.1), `/despesas` renders ExpensesPage (Req 1.2), unknown route redirects (Req 1.6), active link style (Req 1.9) |

### Integration Tests

Integration tests verify end-to-end flows with a small number of representative examples:

| Test file | Scenarios covered |
|---|---|
| `src/__tests__/budgetContext.integration.test.ts` | Context propagates updated data after addTransaction (Req 3.6), KPIs re-render after mutation |
| `src/__tests__/localStorage.integration.test.ts` | Data persists across simulated page reload (Req 7.1, 7.2) |

### Testing Constraints

- **`InMemoryAdapter` is the default test double** — all PBT and unit tests for service logic use `InMemoryAdapter` to avoid `localStorage` mocking overhead.
- **`LocalStorageAdapter` tests** mock `localStorage` via `vi.stubGlobal` or `jsdom`'s built-in localStorage.
- **No snapshot tests** for charts — Recharts SVG output is too volatile; chart behavior is verified through data-driven unit tests on the data transformation functions (`getCategoryDistribution`, `calculateTotalForMonth`).
- **Minimum 100 iterations** per property-based test (fast-check default is 100; do not reduce).
- **Coverage target**: 80% line coverage on `src/services/` and `src/context/`.
