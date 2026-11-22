import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: '0.0.0',
  getDocument: vi.fn(),
}));

import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BudgetProvider } from '../context/BudgetContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useBudget } from '../context/useBudget';
import { LocalStorageAdapter } from '../services/LocalStorageAdapter';
import DashboardPage from '../pages/DashboardPage';
import BudgetDetailsPage from '../pages/BudgetDetailsPage';
import StatementPage from '../pages/StatementPage';
import { parseBRL, formatBRL } from '../utils/currency';

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;

// Polyfill matchMedia for ThemeProvider in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
global.fetch = mockFetch as unknown as typeof fetch;

function createWrapper(initialRoute = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              <BudgetProvider>{children}</BudgetProvider>
            </MemoryRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe('Characterization Suite — Currency Utilities', () => {
  it('parses and formats BRL currency values consistently', () => {
    expect(parseBRL('R$ 1.234,56')).toBeCloseTo(1234.56, 2);
    expect(parseBRL('0,00')).toBe(0);
    expect(parseBRL('')).toBe(0);
    expect(formatBRL(1500)).toMatch(/R\$\s*1\.500,00/);
  });
});

describe('Characterization Suite — LocalStorageAdapter (Offline Mode)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads reconciled default seed budgetData when localStorage is empty', () => {
    const adapter = new LocalStorageAdapter();
    const data = adapter.getBudgetData();

    expect(data.metadata.currency).toBe('BRL');
    expect(data.income['Receita']?.total).toBe(62000);
    expect(data.expenses['Gastos Total']?.total).toBe(-43600);
    expect(data.balance.total).toBe(18400);

    // Verify March category sum reconciles with pre-computed Gastos Total (-3900)
    const marCategorySum = Object.entries(data.expenses)
      .filter(([name]) => name !== 'Gastos Total')
      .reduce((acc, [, entry]) => acc + entry.monthlyValues.Mar, 0);
    expect(marCategorySum).toBe(-3900);
    expect(data.expenses['Gastos Total']?.monthlyValues.Mar).toBe(-3900);
  });

  it('persists added, updated, and deleted transactions and skips exact duplicates', () => {
    const adapter = new LocalStorageAdapter();

    const created = adapter.addTransaction({
      valor: 250,
      categoria: 'Alimentação',
      mes: 'Jan',
      data: '2026-01-15',
      descricao: 'Supermercado',
      banco: 'Itaú',
    });

    expect(created.id).toBeTruthy();
    expect(adapter.getTransactions()).toHaveLength(1);
    expect(adapter.getBudgetData().expenses['Alimentação']?.monthlyValues.Jan).toBe(-250);

    // Duplicate detection on batch import
    const report = adapter.addTransactions([
      {
        valor: 250,
        categoria: 'Alimentação',
        mes: 'Jan',
        data: '2026-01-15',
        descricao: 'Supermercado',
        banco: 'Itaú',
      },
      {
        valor: 120,
        categoria: 'Farmácia',
        mes: 'Jan',
        data: '2026-01-16',
        descricao: 'Drogaria',
      },
    ]);

    expect(report).toEqual({ imported: 1, skipped: 1 });
    expect(adapter.getTransactions()).toHaveLength(2);

    // Update transaction
    const updated = adapter.updateTransaction(created.id, { valor: 300 });
    expect(updated.valor).toBe(300);
    expect(adapter.getBudgetData().expenses['Alimentação']?.monthlyValues.Jan).toBe(-300);

    // Delete transaction
    adapter.deleteTransaction(created.id);
    expect(adapter.getTransactions()).toHaveLength(1);
    expect(adapter.getBudgetData().expenses['Alimentação']?.monthlyValues.Jan).toBe(0);
  });
});

describe('Characterization Suite — BudgetContext (API Mode Rollups & Reconciliation)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFetch.mockReset();
    window.localStorage.setItem('authToken', 'characterization-token');
    window.localStorage.setItem('userId', 'user-123');
    window.localStorage.setItem('userEmail', 'analyst@example.com');
  });

  it('reconciles monthly totals, category distribution, and balance in API mode', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'tx-inc-1',
              userId: 'user-123',
              amount: 8000,
              date: '2026-03-05',
              category: 'Receita',
              description: 'Salário Março',
              bank: 'Itaú',
              type: 'INCOME',
            },
            {
              id: 'tx-exp-1',
              userId: 'user-123',
              amount: 1200,
              date: '2026-03-10',
              category: 'Alimentação',
              description: 'Mercado',
              bank: 'Nubank',
              type: 'EXPENSE',
            },
            {
              id: 'tx-exp-2',
              userId: 'user-123',
              amount: 800,
              date: '2026-03-15',
              category: 'Contas',
              description: 'Energia e Água',
              bank: 'Itaú',
              type: 'EXPENSE',
            },
          ],
        } as Response);
      }
      if (url.includes('/api/users/user-123/metadata')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            realBalance: 15432.1,
            updatedDate: '2026-03-15T12:00:00Z',
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);
    });

    const { result } = renderHook(() => useBudget(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.useApi).toBe(true);
      expect(result.current.transactions).toHaveLength(3);
    });

    // Monthly totals for March
    const marTotals = result.current.calculateTotalForMonth('Mar');
    expect(marTotals).toEqual({
      income: 8000,
      expenses: 2000,
      balance: 6000,
    });

    // Category distribution reconciles with total expenses
    const dist = result.current.getCategoryDistribution();
    expect(dist).toHaveLength(2);
    expect(dist[0]).toEqual({ name: 'Alimentação', value: 1200, percentage: 60 });
    expect(dist[1]).toEqual({ name: 'Contas', value: 800, percentage: 40 });
    const distSum = dist.reduce((acc, item) => acc + item.value, 0);
    expect(distSum).toBe(Math.abs(result.current.data.expenses['Gastos Total']?.total ?? 0));

    // Annual matrix balance reconciles with income + Gastos Total
    expect(result.current.data.income['Receita']?.total).toBe(8000);
    expect(result.current.data.expenses['Gastos Total']?.total).toBe(-2000);
    expect(result.current.data.balance.total).toBe(6000);
  });
});

describe('Characterization Suite — Key Screens (Dashboard, Details, Statement)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFetch.mockReset();
  });

  it('renders DashboardPage KPI summary cards and allows inline Real Balance editing', () => {
    render(<DashboardPage />, { wrapper: createWrapper('/') });

    expect(screen.getByText('Orçamento 2026')).toBeInTheDocument();
    expect(screen.getByText('Total Receitas')).toBeInTheDocument();
    expect(screen.getByText('Total Despesas')).toBeInTheDocument();
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();
    expect(screen.getByText('Distribuição de Gastos')).toBeInTheDocument();
    expect(screen.getByText('Tendência Mensal')).toBeInTheDocument();

    // Click Saldo Real to enter inline edit mode
    const realBalanceDisplay = screen.getByTitle('Clique para editar');
    fireEvent.click(realBalanceDisplay);

    const input = screen.getByPlaceholderText('0,00');
    fireEvent.change(input, { target: { value: '12500,50' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(/R\$\s*12\.500,50/)).toBeInTheDocument();
  });

  it('renders BudgetDetailsPage sections and toggles collapse state', () => {
    render(<BudgetDetailsPage />, { wrapper: createWrapper('/details') });

    expect(screen.getByText('Detalhes Financeiros')).toBeInTheDocument();
    expect(screen.getByText('Receitas')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();

    const collapseReceitasBtn = screen.getByRole('button', { name: /Recolher Receitas/i });
    expect(collapseReceitasBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseReceitasBtn);
    expect(
      screen.getByRole('button', { name: /Expandir Receitas/i })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders StatementPage and filters transactions by search query', async () => {
    window.localStorage.setItem('authToken', 'token-1');
    window.localStorage.setItem('userId', 'user-1');
    window.localStorage.setItem('userEmail', 'user@example.com');

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'tx-101',
              userId: 'user-1',
              amount: 95.5,
              date: '2026-04-10',
              category: 'Farmácia',
              description: 'Drogasil Paulista',
              bank: 'Itaú',
              type: 'EXPENSE',
            },
            {
              id: 'tx-102',
              userId: 'user-1',
              amount: 340.0,
              date: '2026-04-11',
              category: 'Alimentação',
              description: 'Pão de Açúcar',
              bank: 'Nubank',
              type: 'EXPENSE',
            },
          ],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ realBalance: 0, updatedDate: null }),
      } as Response);
    });

    render(<StatementPage />, { wrapper: createWrapper('/statement') });

    await waitFor(() => {
      expect(screen.getByText('Drogasil Paulista')).toBeInTheDocument();
      expect(screen.getByText('Pão de Açúcar')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Pesquisar descrições ou categorias...');
    fireEvent.change(searchInput, { target: { value: 'Drogasil' } });

    expect(screen.getByText('Drogasil Paulista')).toBeInTheDocument();
    expect(screen.queryByText('Pão de Açúcar')).not.toBeInTheDocument();
  });
});
