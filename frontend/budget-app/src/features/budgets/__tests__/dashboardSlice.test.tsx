import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BudgetProvider } from '../../../context/BudgetContext';
import { AuthProvider } from '../../../context/AuthContext';
import { ThemeProvider } from '../../../context/ThemeContext';
import DashboardPage from '../../../pages/DashboardPage';
import { setPrivacyMask } from '../../../shared/hooks/usePrivacyMask';
import { budgetData } from '../../../budgetData';
import { majorToMinor } from '../../../shared/lib/money';
import {
  calculateCategoryDistribution,
  groupDonutDistribution,
  reconcileBudgetData,
} from '../index';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;

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

function createDashboardWrapper(initialEntry = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
              <BudgetProvider>{children}</BudgetProvider>
            </MemoryRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe('Phase 4 Vertical Slice — Dashboard & Analytics Modernization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPrivacyMask(false);
  });

  it('caps donut segments at <= 6 ("Outras Categorias") while preserving exact integer minor-unit sum (§7.1)', () => {
    const reconciled = reconcileBudgetData(budgetData);
    const fullDist = calculateCategoryDistribution(reconciled);
    expect(fullDist.length).toBe(11);

    const donutSegments = groupDonutDistribution(fullDist, 6);
    expect(donutSegments).toHaveLength(6);
    expect(donutSegments[5]?.name).toBe('Outras Categorias');

    const fullSumMinor = fullDist.reduce((acc, d) => acc + majorToMinor(d.value), 0);
    const donutSumMinor = donutSegments.reduce((acc, d) => acc + majorToMinor(d.value), 0);
    expect(donutSumMinor).toBe(fullSumMinor);
    expect(donutSumMinor).toBe(43600_00);
  });

  it('filters KPI cards, comparison deltas, chart tables, and drill-down link by URL ?period=Mar and reconciles totals', () => {
    render(<DashboardPage />, { wrapper: createDashboardWrapper('/?period=Mar') });

    // Period badge in header
    expect(screen.getAllByText('Mar 2026').length).toBeGreaterThanOrEqual(1);

    // KPI Cards for March: Income = R$ 5.000,00, Expenses = R$ 3.900,00, Net = R$ 1.100,00
    expect(screen.getByRole('article', { name: 'Total Receitas' })).toHaveTextContent(
      /R\$\s*5\.000,00/
    );
    expect(screen.getByRole('article', { name: 'Total Despesas' })).toHaveTextContent(
      /R\$\s*3\.900,00/
    );
    expect(screen.getByRole('article', { name: 'Saldo Líquido' })).toHaveTextContent(
      /R\$\s*1\.100,00/
    );

    // Comparison delta vs Fev (Expenses in Fev = 3250, Mar = 3900 -> +20% vs. Fev, unfavorable)
    expect(screen.getByRole('article', { name: 'Total Despesas' })).toHaveTextContent(
      /\+20%\s*vs\.\s*Fev/
    );

    // Toggle "Ver como tabela" on Distribuição de Gastos andTendência Mensal
    const toggleDistTable = screen.getByRole('button', {
      name: /Ver Distribuição de Gastos como tabela de dados/i,
    });
    fireEvent.click(toggleDistTable);

    const toggleTrendTable = screen.getByRole('button', {
      name: /Ver Tendência Mensal como tabela de dados/i,
    });
    fireEvent.click(toggleTrendTable);

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);

    // Category consumption progress rows render with progressbars and drill-down link preserving ?period=Mar
    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars.length).toBeGreaterThan(0);

    const drillDownLink = screen.getByRole('link', { name: /Ver detalhamento completo/i });
    expect(drillDownLink).toHaveAttribute('href', '/details?period=Mar');
  });

  it('renders Q1 quarter summary and non-color-only category status indicators when URL has ?period=Q1', () => {
    render(<DashboardPage />, { wrapper: createDashboardWrapper('/?period=Q1') });

    // Q1 (Jan+Fev+Mar): Income = 15,000; Expenses = 3500+3250+3900 = 10,650; Net = 4,350
    expect(screen.getByRole('article', { name: 'Total Receitas' })).toHaveTextContent(
      /R\$\s*15\.000,00/
    );
    expect(screen.getByRole('article', { name: 'Total Despesas' })).toHaveTextContent(
      /R\$\s*10\.650,00/
    );
    expect(screen.getByRole('article', { name: 'Saldo Líquido' })).toHaveTextContent(
      /R\$\s*4\.350,00/
    );

    // Non-color-only status text in Consumo por Categoria
    const consumptionSection = screen.getByRole('region', { name: 'Consumo por Categoria' });
    expect(consumptionSection).toHaveTextContent(/Referência:/);
  });
});
