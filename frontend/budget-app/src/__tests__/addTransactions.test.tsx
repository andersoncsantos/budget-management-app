import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BudgetProvider } from '../context/BudgetContext';
import { AuthProvider } from '../context/AuthContext';
import { useBudget } from '../context/useBudget';

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
global.fetch = mockFetch as unknown as typeof fetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const routeMap = new Map<RegExp, MockResponse>();

function mockEndpoint(urlMatcher: RegExp, response: MockResponse): void {
  routeMap.set(urlMatcher, response);
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [matcher, resp] of routeMap) {
      if (matcher.test(url)) {
        return Promise.resolve(resp as Response);
      }
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BudgetProvider>{children}</BudgetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('addTransactions (API mode)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch.mockReset();
    routeMap.clear();
    localStorageMock.setItem('authToken', 'fake-token');
    localStorageMock.setItem('userId', '11111111-1111-1111-1111-111111111111');
    localStorageMock.setItem('userEmail', 'test@example.com');
  });

  it('resolves category and bank names from existing transactions', async () => {
    // Transactions endpoint — populates apiTransactions with known category and
    // bank names so the callback can resolve case-insensitive CSV values.
    mockEndpoint(/\/api\/transactions\?/, {
      ok: true, status: 200,
      json: async () => [
        { id: 'tx-1', userId: '11111111-1111-1111-1111-111111111111', amount: 10, date: '2026-01-01', category: 'Alimentação', description: 'Market', type: 'EXPENSE', bank: 'Itaú' },
        { id: 'tx-2', userId: '11111111-1111-1111-1111-111111111111', amount: 20, date: '2026-01-01', category: 'Transporte', description: 'Bus', type: 'EXPENSE', bank: 'Nubank' },
        { id: 'tx-3', userId: '11111111-1111-1111-1111-111111111111', amount: 30, date: '2026-01-01', category: 'Salário', description: 'Salary', type: 'INCOME', bank: 'Bradesco' },
      ],
    });
    // Categories endpoint — provides IDs for unique category lookup
    mockEndpoint(/\/api\/categories\?/, {
      ok: true, status: 200,
      json: async () => [
        { id: 'cat-1', name: 'Alimentação', userId: '11111111-1111-1111-1111-111111111111', createdAt: '2026-01-01' },
        { id: 'cat-2', name: 'Transporte', userId: '11111111-1111-1111-1111-111111111111', createdAt: '2026-01-01' },
        { id: 'cat-3', name: 'Salário', userId: '11111111-1111-1111-1111-111111111111', createdAt: '2026-01-01' },
      ],
    });
    // Batch endpoint
    mockEndpoint(/\/api\/transactions\/batch/, {
      ok: true, status: 200,
      json: async () => ({
        totalRecords: 3,
        importedRecords: 3,
        failedRecords: 0,
        errors: [],
      }),
    });

    const { result } = renderHook(() => useBudget(), { wrapper });

    await waitFor(() => {
      expect(result.current.useApi).toBe(true);
    });
    // Wait for categories to be loaded from the mocked transactions response
    await waitFor(() => {
      expect(result.current.getCategories()).toContain('Alimentação');
    });

    const rows = [
      { valor: -150.5, categoria: 'alimentação', mes: 'Jun' as const, data: '2026-06-15', descricao: 'Mercado', banco: 'itaú' },
      { valor: -25.3, categoria: 'Transporte', mes: 'Jun' as const, data: '2026-06-16', descricao: 'Uber', banco: 'NUBANK' },
      { valor: 5000, categoria: 'SALÁRIO', mes: 'Jun' as const, data: '2026-06-17', descricao: 'Salário', banco: 'bradesco' },
    ];

    let report;
    await act(async () => {
      report = await result.current.addTransactions(rows);
    });

    expect(report).toEqual({ imported: 3, skipped: 0 });

    const batchCallArgs = mockFetch.mock.calls.find(
      args => (args[0] as string).includes('/api/transactions/batch')
    );
    expect(batchCallArgs).toBeDefined();
    const body = JSON.parse((batchCallArgs![1] as RequestInit).body as string);
    expect(body.userId).toBe('11111111-1111-1111-1111-111111111111');
    expect(body.transactions).toHaveLength(3);
    // Categories should be resolved to their exact stored names
    expect(body.transactions[0].category).toBe('Alimentação');
    expect(body.transactions[1].category).toBe('Transporte');
    expect(body.transactions[2].category).toBe('Salário');
    // Bank names should be resolved case-insensitively too
    expect(body.transactions[0].bank).toBe('Itaú');
    expect(body.transactions[1].bank).toBe('Nubank');
    expect(body.transactions[2].bank).toBe('Bradesco');
    expect(body.transactions[0]).toMatchObject({
      amount: 150.5,
      type: 'EXPENSE',
      date: '2026-06-15',
    });
  });

  it('uses original names when apiTransactions has no matching category or bank', async () => {
    // Transactions list with different categories/banks — no match for CSV values
    mockEndpoint(/\/api\/transactions\?/, {
      ok: true, status: 200,
      json: async () => [
        { id: 'tx-1', userId: '11111111-1111-1111-1111-111111111111', amount: 10, date: '2026-01-01', category: 'Existing', description: 'Existing', type: 'EXPENSE', bank: 'ExistingBank' },
      ],
    });
    // Categories endpoint — provides IDs for unique category lookup
    mockEndpoint(/\/api\/categories\?/, {
      ok: true, status: 200,
      json: async () => [
        { id: 'cat-1', name: 'Existing', userId: '11111111-1111-1111-1111-111111111111', createdAt: '2026-01-01' },
      ],
    });
    mockEndpoint(/\/api\/transactions\/batch/, {
      ok: true, status: 200,
      json: async () => ({
        totalRecords: 1,
        importedRecords: 1,
        failedRecords: 0,
        errors: [],
      }),
    });

    const { result } = renderHook(() => useBudget(), { wrapper });
    await waitFor(() => expect(result.current.useApi).toBe(true));
    await waitFor(() => {
      expect(result.current.getCategories()).toContain('Existing');
    });

    const rows = [
      { valor: -10, categoria: 'CustomCat', mes: 'Jun' as const, data: '2026-06-15', descricao: 'Test', banco: 'CustomBank' },
    ];

    let report;
    await act(async () => {
      report = await result.current.addTransactions(rows);
    });

    expect(report).toEqual({ imported: 1, skipped: 0 });

    const batchCallArgs = mockFetch.mock.calls.find(
      args => (args[0] as string).includes('/api/transactions/batch')
    );
    expect(batchCallArgs).toBeDefined();
    const body = JSON.parse((batchCallArgs![1] as RequestInit).body as string);
    // No match found — original CSV names preserved
    expect(body.transactions[0].category).toBe('CustomCat');
    expect(body.transactions[0].bank).toBe('CustomBank');
  });

  it('sends null bank when CSV has no bank', async () => {
    mockEndpoint(/\/api\/transactions\?/, { ok: true, status: 200, json: async () => [] });
    mockEndpoint(/\/api\/categories\?/, { ok: true, status: 200, json: async () => [] });
    mockEndpoint(/\/api\/transactions\/batch/, {
      ok: true, status: 200,
      json: async () => ({
        totalRecords: 1,
        importedRecords: 1,
        failedRecords: 0,
        errors: [],
      }),
    });

    const { result } = renderHook(() => useBudget(), { wrapper });
    await waitFor(() => expect(result.current.useApi).toBe(true));

    const rows = [
      { valor: -10, categoria: 'X', mes: 'Jun' as const, data: '2026-06-15', descricao: 'Test' },
    ];

    let report;
    await act(async () => {
      report = await result.current.addTransactions(rows);
    });

    expect(report).toEqual({ imported: 1, skipped: 0 });

    const batchCallArgs = mockFetch.mock.calls.find(
      args => (args[0] as string).includes('/api/transactions/batch')
    );
    expect(batchCallArgs).toBeDefined();
    const body = JSON.parse((batchCallArgs![1] as RequestInit).body as string);
    expect(body.transactions[0].bank).toBeNull();
  });

  it('falls back to individual createTransaction calls when batch fails', async () => {
    mockEndpoint(/\/api\/transactions\?/, { ok: true, status: 200, json: async () => [] });
    mockEndpoint(/\/api\/categories\?/, { ok: true, status: 200, json: async () => [] });
    // Batch endpoint fails
    mockEndpoint(/\/api\/transactions\/batch/, {
      ok: false, status: 500,
      json: async () => ({ message: 'Server error' }),
    });
    // Individual createTransaction endpoint (called as fallback)
    mockEndpoint(/\/api\/transactions$/, {
      ok: true, status: 201,
      json: async () => ({ id: 'new-1', userId: '11111111-1111-1111-1111-111111111111', amount: 10, date: '2026-06-15', category: 'X', description: 'Test', type: 'EXPENSE', bank: null }),
    });

    const { result } = renderHook(() => useBudget(), { wrapper });
    await waitFor(() => expect(result.current.useApi).toBe(true));

    const rows = [
      { valor: -10, categoria: 'X', mes: 'Jun' as const, data: '2026-06-15', descricao: 'Test' },
    ];

    let report;
    await act(async () => {
      report = await result.current.addTransactions(rows);
    });

    // Batch failed, but individual fallback succeeded
    expect(report).toEqual({ imported: 1, skipped: 0 });
  });

  it('returns skipped count when both batch and individual calls fail', async () => {
    mockEndpoint(/\/api\/transactions\?/, { ok: true, status: 200, json: async () => [] });
    mockEndpoint(/\/api\/categories\?/, { ok: true, status: 200, json: async () => [] });
    // Batch fails
    mockEndpoint(/\/api\/transactions\/batch/, {
      ok: false, status: 500,
      json: async () => ({ message: 'Server error' }),
    });
    // Individual call also fails
    mockEndpoint(/\/api\/transactions$/, {
      ok: false, status: 500,
      json: async () => ({ message: 'Individual error' }),
    });

    const { result } = renderHook(() => useBudget(), { wrapper });
    await waitFor(() => expect(result.current.useApi).toBe(true));

    const rows = [
      { valor: -10, categoria: 'X', mes: 'Jun' as const, data: '2026-06-15', descricao: 'Test' },
    ];

    let report;
    await act(async () => {
      report = await result.current.addTransactions(rows);
    });

    expect(report).toEqual({ imported: 0, skipped: 1, errors: [{ line: 2, message: 'Individual error' }] });
  });

  it('returns empty category distribution when API has no transactions instead of falling back to cached local data', async () => {
    mockEndpoint(/\/api\/transactions\?/, { ok: true, status: 200, json: async () => [] });

    const { result } = renderHook(() => useBudget(), { wrapper });
    await waitFor(() => expect(result.current.useApi).toBe(true));

    expect(result.current.getCategoryDistribution()).toEqual([]);
  });
});
