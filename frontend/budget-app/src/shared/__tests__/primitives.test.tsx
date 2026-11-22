import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { MoneyDisplay } from '../ui/MoneyDisplay';
import { KpiCard } from '../ui/KpiCard';
import { ChartCard } from '../charts/ChartCard';
import { Dialog } from '../ui/Dialog';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { setPrivacyMask } from '../hooks/usePrivacyMask';
import { fromMinorUnits } from '../lib/money';
import MainLayout from '../../components/layout/MainLayout';
import { ThemeProvider } from '../../context/ThemeContext';
import { AuthProvider } from '../../context/AuthContext';

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

describe('Shared Primitives — MoneyDisplay & Privacy Mask (§5.8, §6.1, §10.2)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPrivacyMask(false);
  });

  it('formats Money value objects and exposes full precision value in compact mode', () => {
    render(<MoneyDisplay value={fromMinorUnits(12500000, 'BRL')} compact />);

    const el = screen.getByLabelText(/R\$\s*125\.000,00/);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('title', expect.stringMatching(/R\$\s*125\.000,00/));
  });

  it('masks sensitive monetary values when privacy mode is enabled', () => {
    render(<MoneyDisplay value={5432.1} />);
    expect(screen.getByText(/R\$\s*5\.432,10/)).toBeInTheDocument();

    act(() => {
      setPrivacyMask(true);
    });
    expect(screen.getByLabelText('Valor oculto por privacidade')).toHaveTextContent('R$ •••••');
  });
});

describe('Shared Primitives — KpiCard (§6.1, §6.2, §9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPrivacyMask(false);
  });

  it('renders value, non-color-only delta badge, accessible tooltip, and privacy toggle', () => {
    render(
      <KpiCard
        title="Total Receitas"
        value={62000}
        icon={TrendingUp}
        tone="positive"
        tooltip="Soma de todas as receitas confirmadas no período selecionado."
        showPrivacyToggle
        delta={{
          direction: 'up',
          tone: 'positive',
          label: '+14,0% vs. mês anterior',
        }}
      />
    );

    expect(screen.getByText('Total Receitas')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*62\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('+14,0% vs. mês anterior')).toBeInTheDocument();
    expect(screen.getByText(/Variação favorável:/)).toBeInTheDocument();

    // Toggle info tooltip
    const infoBtn = screen.getByRole('button', { name: /Informações sobre Total Receitas/i });
    fireEvent.click(infoBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Soma de todas as receitas confirmadas no período selecionado.'
    );

    // Toggle privacy mask via card button
    const privacyBtn = screen.getByRole('button', { name: /Ocultar valores monetários/i });
    fireEvent.click(privacyBtn);
    expect(screen.getByLabelText('Valor oculto por privacidade')).toBeInTheDocument();
  });

  it('renders CardSkeleton when isLoading is true', () => {
    render(
      <KpiCard
        title="Saldo Líquido"
        value={0}
        icon={TrendingUp}
        isLoading
      />
    );
    expect(screen.getByRole('status', { name: /Carregando Saldo Líquido/i })).toBeInTheDocument();
  });
});

describe('Shared Primitives — ChartCard Accessible Data-Table Alternative (§7.2, §9)', () => {
  const sampleRows = [
    { category: 'Alimentação', amount: 9950, share: '22,8%' },
    { category: 'Contas', amount: 7300, share: '16,7%' },
  ];

  it('toggles between visual chart and semantic data table ("Ver como tabela")', () => {
    render(
      <ChartCard
        title="Distribuição de Gastos"
        subtitle="BRL (R$) · Jan–Dez 2026"
        tableData={sampleRows}
        getRowKey={(r) => r.category}
        tableColumns={[
          { key: 'cat', header: 'Categoria', renderCell: (r) => r.category },
          { key: 'amt', header: 'Valor (R$)', align: 'right', renderCell: (r) => r.amount },
          { key: 'pct', header: '% do Total', align: 'right', renderCell: (r) => r.share },
        ]}
      >
        <div data-testid="visual-chart">Visual Recharts Donut</div>
      </ChartCard>
    );

    expect(screen.getByText('BRL (R$) · Jan–Dez 2026')).toBeInTheDocument();
    expect(screen.getByTestId('visual-chart')).toBeInTheDocument();

    // Switch to accessible table view
    const toggleBtn = screen.getByRole('button', {
      name: /Ver Distribuição de Gastos como tabela de dados/i,
    });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggleBtn);

    expect(screen.queryByTestId('visual-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('22,8%')).toBeInTheDocument();

    // Switch back to chart view
    const backBtn = screen.getByRole('button', {
      name: /Ver Distribuição de Gastos como gráfico/i,
    });
    expect(backBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(backBtn);
    expect(screen.getByTestId('visual-chart')).toBeInTheDocument();
  });
});

describe('Shared Primitives — Dialog & ErrorBoundary (§4.2, §9)', () => {
  it('traps Tab focus inside Dialog and closes on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Dialog
        isOpen
        onClose={onClose}
        title="Confirmar Exclusão"
        description="Esta ação removerá o registro permanentemente."
        footer={
          <>
            <button type="button">Cancelar</button>
            <button type="button">Confirmar</button>
          </>
        }
      >
        <p>Conteúdo do modal</p>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();

    // Escape closes the modal
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('catches rendering errors in ErrorBoundary and recovers on retry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    function FlakyWidget() {
      if (shouldThrow) {
        throw new Error('Falha de conexão simulada');
      }
      return <div>Widget recuperado com sucesso</div>;
    }

    render(
      <ErrorBoundary title="Erro no Widget Financeiro">
        <FlakyWidget />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Erro no Widget Financeiro');
    expect(screen.getByText('Falha de conexão simulada')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(screen.getByText('Widget recuperado com sucesso')).toBeInTheDocument();

    spy.mockRestore();
  });
});

describe('App Shell — MainLayout Accessibility & URL Period State (§6.1, §9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders skip link, global search with "/" shortcut, and URL-synced period selector', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<div>Conteúdo Principal</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Pular para o conteúdo principal')).toHaveAttribute(
      'href',
      '#main-content'
    );

    // Global "/" shortcut focuses the search input
    const searchInput = screen.getByRole('searchbox', {
      name: /Buscar transações ou categorias/i,
    });
    fireEvent.keyDown(document, { key: '/' });
    expect(document.activeElement).toBe(searchInput);

    // Period selector updates active selection
    const periodSelect = screen.getByRole('combobox', { name: /Período de análise/i });
    expect(periodSelect).toHaveValue('YEAR');
    fireEvent.change(periodSelect, { target: { value: 'Q1' } });
    expect(periodSelect).toHaveValue('Q1');
  });
});
