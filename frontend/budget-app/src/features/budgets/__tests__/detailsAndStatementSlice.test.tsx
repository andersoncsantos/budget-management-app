import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: '0.0.0',
  getDocument: vi.fn(),
}));

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BudgetProvider } from '../../../context/BudgetContext';
import { AuthProvider } from '../../../context/AuthContext';
import { ThemeProvider } from '../../../context/ThemeContext';
import BudgetDetailsPage from '../../../pages/BudgetDetailsPage';
import StatementPage from '../../../pages/StatementPage';
import { setPrivacyMask } from '../../../shared/hooks/usePrivacyMask';
import {
  buildSanitizedStatementCsv,
  buildSanitizedStatementPrintHtml,
  escapeHtml,
  sanitizeCsvCell,
} from '../../../shared/lib/exportSanitizer';

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

function createSliceWrapper(initialEntry = '/details') {
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

describe('Export Security — CSV Formula Injection & Print HTML XSS Sanitization (§10.2)', () => {
  it('neutralizes CSV formula injection payloads (=, +, -, @, tab, CR) and escapes quotes', () => {
    expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe(`"'=cmd|' /C calc'!A0"`);
    expect(sanitizeCsvCell('+SUM(A1:A10)')).toBe(`"'+SUM(A1:A10)"`);
    expect(sanitizeCsvCell('-2+3')).toBe(`"'-2+3"`);
    expect(sanitizeCsvCell('@IMPORTXML()')).toBe(`"'@IMPORTXML()"`);
    expect(sanitizeCsvCell('  =HYPERLINK("http://evil")')).toBe(
      `"'  =HYPERLINK(""http://evil"")"`
    );
    expect(sanitizeCsvCell('Padaria "São Bento"')).toBe(`"Padaria ""São Bento"""`);

    const csv = buildSanitizedStatementCsv([
      {
        id: 'tx-1',
        data: '2026-03-10',
        categoria: 'Alimentação',
        descricao: '=1+1',
        valor: -50.25,
        banco: '@EvilBank',
        mes: 'Mar',
      },
    ]);

    expect(csv).toContain('\uFEFFDate,Category,Description,Amount,Bank');
    expect(csv).toContain(`"2026-03-10","Alimentação","'=1+1",-50.25,"'@EvilBank"`);
  });

  it('escapes HTML entities in buildSanitizedStatementPrintHtml to prevent XSS', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );

    const html = buildSanitizedStatementPrintHtml(
      [
        {
          id: 'tx-xss',
          data: '2026-03-10',
          categoria: '<img src=x onerror=alert(1)>',
          descricao: '<script>evil()</script>',
          valor: -100,
          banco: 'Itaú & Co',
          mes: 'Mar',
        },
      ],
      '12/04/2026'
    );

    expect(html).not.toContain('<script>evil()</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;evil()&lt;/script&gt;');
    expect(html).toContain('Itaú &amp; Co');
  });
});

describe('Phase 5 Vertical Slice — BudgetDetailsPage Matrix (§5.7, §6.2, §8)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPrivacyMask(false);
  });

  it('filters visible columns to Q1 when URL has ?period=Q1 and reconciles subtotals with Saldo Final', () => {
    render(<BudgetDetailsPage />, { wrapper: createSliceWrapper('/details?period=Q1') });

    expect(screen.getAllByText(/Q1 \(Jan–Mar 2026\)/).length).toBeGreaterThanOrEqual(1);

    // Subtotal (Receitas) in Q1 = +R$ 15.000,00
    const receitasSection = screen.getByRole('region', { name: 'Receitas' });
    expect(within(receitasSection).getByText('Subtotal (Receitas)')).toBeInTheDocument();
    expect(receitasSection).toHaveTextContent(/\+R\$\s*15\.000,00/);

    // Subtotal (Despesas) in Q1 = -R$ 10.650,00
    const despesasSection = screen.getByRole('region', { name: 'Despesas' });
    expect(within(despesasSection).getByText('Subtotal (Despesas)')).toBeInTheDocument();
    expect(despesasSection).toHaveTextContent(/-R\$\s*10\.650,00/);

    // Saldo Final in Q1 = +R$ 4.350,00 (15.000 - 10.650)
    const saldoSection = screen.getByRole('region', { name: 'Saldo Líquido' });
    expect(saldoSection).toHaveTextContent(/\+R\$\s*4\.350,00/);
  });

  it('supports aria-sort column sorting and comfortable/compact density toggle', () => {
    render(<BudgetDetailsPage />, { wrapper: createSliceWrapper('/details') });

    const compactBtn = screen.getByRole('button', { name: 'Compacta' });
    expect(compactBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(compactBtn);
    expect(compactBtn).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('budget-app:table-density')).toBe('compact');

    const despesasSection = screen.getByRole('region', { name: 'Despesas' });
    const totalSortBtn = within(despesasSection).getByRole('button', { name: 'Total' });
    fireEvent.click(totalSortBtn);

    const totalHeader = totalSortBtn.closest('th');
    expect(totalHeader).toHaveAttribute('aria-sort', 'descending');
  });
});

describe('Phase 5 Vertical Slice — StatementPage Data Grid, URL State & Accessible Dialogs (§8, §9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPrivacyMask(false);
    mockFetch.mockReset();
    window.localStorage.setItem('authToken', 'token-slice5');
    window.localStorage.setItem('userId', 'user-slice5');
    window.localStorage.setItem('userEmail', 'analyst@example.com');

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 'tx-1',
              userId: 'user-slice5',
              amount: 5000,
              date: '2026-03-05',
              category: 'Receita',
              description: 'Salário Mensal',
              bank: 'Itaú',
              type: 'INCOME',
            },
            {
              id: 'tx-2',
              userId: 'user-slice5',
              amount: 1200,
              date: '2026-03-10',
              category: 'Alimentação',
              description: 'Supermercado Extra',
              bank: 'Nubank',
              type: 'EXPENSE',
            },
            {
              id: 'tx-3',
              userId: 'user-slice5',
              amount: 300,
              date: '2026-03-12',
              category: 'Farmácia',
              description: 'Drogaria São Paulo',
              bank: 'Bradesco',
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
  });

  it('reconciles filtered statement footer totals, supports column sorting with aria-sort, and opens accessible Edit/Delete Dialogs', async () => {
    render(<StatementPage />, { wrapper: createSliceWrapper('/statement') });

    await waitFor(() => {
      expect(screen.getByText('Salário Mensal')).toBeInTheDocument();
      expect(screen.getByText('Supermercado Extra')).toBeInTheDocument();
      expect(screen.getByText('Drogaria São Paulo')).toBeInTheDocument();
    });

    // Footer reconciles 3 transactions: +5000 - 1200 - 300 = +R$ 3.500,00
    expect(screen.getByText(/Total Filtrado \(3 registros\):/)).toBeInTheDocument();
    expect(screen.getByText(/\+R\$\s*3\.500,00/)).toBeInTheDocument();

    // Sort by Valor column
    const valorSortBtn = screen.getByRole('button', { name: 'Valor' });
    fireEvent.click(valorSortBtn);
    expect(valorSortBtn.closest('th')).toHaveAttribute('aria-sort', 'descending');

    // Open Edit modal for Supermercado Extra and verify accessible dialog + labeled inputs
    const editBtn = screen.getByRole('button', {
      name: /Editar transação Supermercado Extra/i,
    });
    fireEvent.click(editBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByLabelText(/Descrição/i)).toHaveValue('Supermercado Extra');

    // Close edit modal with Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open Delete modal and verify accessible dialog
    const deleteBtn = screen.getByRole('button', {
      name: /Excluir transação Drogaria São Paulo/i,
    });
    fireEvent.click(deleteBtn);
    expect(screen.getByRole('dialog')).toHaveTextContent('Excluir Transação');
  });
});
