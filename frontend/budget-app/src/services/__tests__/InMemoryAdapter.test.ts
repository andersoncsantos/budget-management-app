import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAdapter } from '../InMemoryAdapter';
import { budgetData } from '../../budgetData';
import type { Month, BudgetData, BudgetEntry } from '../../budgetData';
import type { Transaction } from '../IBudgetService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS: Month[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Build a zeroed BudgetData with the same category structure as budgetData
 * but all monthly values and totals set to 0. This isolates tests from
 * pre-existing seed values.
 */
function makeZeroedBudgetData(): BudgetData {
  const zeroEntry = (): BudgetEntry => ({
    monthlyValues: Object.fromEntries(MONTHS.map(m => [m, 0])) as Record<Month, number>,
    total: 0,
  });

  return {
    metadata: { ...budgetData.metadata },
    income: Object.fromEntries(
      Object.keys(budgetData.income).map(k => [k, zeroEntry()])
    ),
    expenses: Object.fromEntries(
      Object.keys(budgetData.expenses).map(k => [k, zeroEntry()])
    ),
    balance: zeroEntry(),
  };
}

/** Minimal valid transaction input for January / Alimentação */
const TX_JAN_ALIMENTACAO: Omit<Transaction, 'id'> = {
  valor: 100.00,
  categoria: 'Alimentação',
  mes: 'Jan',
  data: '2026-01-15',
  descricao: 'Supermercado',
};

/** Minimal valid transaction input for February / Contas */
const TX_FEB_CONTAS: Omit<Transaction, 'id'> = {
  valor: 200.00,
  categoria: 'Contas',
  mes: 'Fev',
  data: '2026-02-10',
};

// ─── getBudgetData ───────────────────────────────────────────────────────────

describe('InMemoryAdapter — getBudgetData', () => {
  it('returns the initial data when no transactions have been added', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const data = adapter.getBudgetData();

    // All monthly values should be 0 in a zeroed adapter
    for (const m of MONTHS) {
      expect(data.balance.monthlyValues[m]).toBe(0);
    }
    expect(data.balance.total).toBe(0);
  });

  it('returns a deep copy — external mutations do not affect internal state', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const data1 = adapter.getBudgetData();

    // Mutate the returned copy
    data1.balance.monthlyValues['Jan'] = 9999;

    const data2 = adapter.getBudgetData();
    expect(data2.balance.monthlyValues['Jan']).toBe(0);
  });

  it('uses budgetData as default initial data when no argument is provided', () => {
    const adapter = new InMemoryAdapter();
    const data = adapter.getBudgetData();

    // The default data has known income for January
    expect(data.income['Receita']!.monthlyValues['Jan']).toBe(budgetData.income['Receita']!.monthlyValues['Jan']);
  });
});

// ─── getTransactions ─────────────────────────────────────────────────────────

describe('InMemoryAdapter — getTransactions', () => {
  it('returns an empty array initially', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    expect(adapter.getTransactions()).toEqual([]);
  });

  it('returns a copy — external mutations do not affect internal state', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    adapter.addTransaction(TX_JAN_ALIMENTACAO);

    const list = adapter.getTransactions();
    list[0]!.valor = 9999;

    const list2 = adapter.getTransactions();
    expect(list2[0]!.valor).toBe(TX_JAN_ALIMENTACAO.valor);
  });
});

// ─── addTransaction ──────────────────────────────────────────────────────────

describe('InMemoryAdapter — addTransaction', () => {
  it('returns the created transaction with a generated id', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    expect(created.id).toBeTruthy();
    expect(typeof created.id).toBe('string');
    expect(created.valor).toBe(TX_JAN_ALIMENTACAO.valor);
    expect(created.categoria).toBe(TX_JAN_ALIMENTACAO.categoria);
    expect(created.mes).toBe(TX_JAN_ALIMENTACAO.mes);
    expect(created.data).toBe(TX_JAN_ALIMENTACAO.data);
    expect(created.descricao).toBe(TX_JAN_ALIMENTACAO.descricao);
  });

  it('increases the transaction list length by 1', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    expect(adapter.getTransactions()).toHaveLength(0);

    adapter.addTransaction(TX_JAN_ALIMENTACAO);
    expect(adapter.getTransactions()).toHaveLength(1);

    adapter.addTransaction(TX_FEB_CONTAS);
    expect(adapter.getTransactions()).toHaveLength(2);
  });

  it('the created transaction appears in getTransactions()', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    const list = adapter.getTransactions();
    expect(list.some(t => t.id === created.id)).toBe(true);
  });

  it('assigns unique ids to each transaction', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction(TX_JAN_ALIMENTACAO);
    const t2 = adapter.addTransaction(TX_FEB_CONTAS);

    expect(t1.id).not.toBe(t2.id);
  });

  it('works without optional descricao field', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_FEB_CONTAS);

    expect(created.descricao).toBeUndefined();
  });
});

// ─── updateTransaction ───────────────────────────────────────────────────────

describe('InMemoryAdapter — updateTransaction', () => {
  it('returns the updated transaction with patched fields', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    const updated = adapter.updateTransaction(created.id, { valor: 250.00, descricao: 'Padaria' });

    expect(updated.id).toBe(created.id);
    expect(updated.valor).toBe(250.00);
    expect(updated.descricao).toBe('Padaria');
    // Unchanged fields retain original values
    expect(updated.categoria).toBe(TX_JAN_ALIMENTACAO.categoria);
    expect(updated.mes).toBe(TX_JAN_ALIMENTACAO.mes);
    expect(updated.data).toBe(TX_JAN_ALIMENTACAO.data);
  });

  it('reflects the update in getTransactions()', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    adapter.updateTransaction(created.id, { valor: 350.00 });

    const list = adapter.getTransactions();
    const found = list.find(t => t.id === created.id);
    expect(found?.valor).toBe(350.00);
  });

  it('throws when the id does not exist', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());

    expect(() => adapter.updateTransaction('non-existent-id', { valor: 100 })).toThrow();
  });

  it('does not change the list length', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    adapter.updateTransaction(created.id, { valor: 500 });

    expect(adapter.getTransactions()).toHaveLength(1);
  });
});

// ─── deleteTransaction ───────────────────────────────────────────────────────

describe('InMemoryAdapter — deleteTransaction', () => {
  it('removes the transaction from the list', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction(TX_JAN_ALIMENTACAO);

    adapter.deleteTransaction(created.id);

    const list = adapter.getTransactions();
    expect(list.some(t => t.id === created.id)).toBe(false);
  });

  it('decreases the list length by 1', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    adapter.addTransaction(TX_JAN_ALIMENTACAO);
    adapter.addTransaction(TX_FEB_CONTAS);
    expect(adapter.getTransactions()).toHaveLength(2);

    const [first] = adapter.getTransactions();
    adapter.deleteTransaction(first!.id);

    expect(adapter.getTransactions()).toHaveLength(1);
  });

  it('throws when the id does not exist', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());

    expect(() => adapter.deleteTransaction('non-existent-id')).toThrow();
  });

  it('only removes the targeted transaction when multiple exist', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction(TX_JAN_ALIMENTACAO);
    const t2 = adapter.addTransaction(TX_FEB_CONTAS);

    adapter.deleteTransaction(t1.id);

    const list = adapter.getTransactions();
    expect(list.some(t => t.id === t1.id)).toBe(false);
    expect(list.some(t => t.id === t2.id)).toBe(true);
  });
});

// ─── Recalculation after addTransaction ─────────────────────────────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

describe('InMemoryAdapter — recalculation after addTransaction', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter(makeZeroedBudgetData());
  });

  it('Req 3.1 — updates the category monthlyValues for the affected month', () => {
    adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-10' });
    adapter.addTransaction({ valor: 50, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-20' });

    const data = adapter.getBudgetData();
    // Two transactions totalling 150 → stored as -150
    expect(data.expenses['Alimentação']!.monthlyValues['Jan']).toBeCloseTo(-150, 5);
    // Other months remain 0
    expect(data.expenses['Alimentação']!.monthlyValues['Fev']).toBe(0);
  });

  it('Req 3.2 — updates "Gastos Total" for the affected month', () => {
    adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Mar', data: '2026-03-05' });
    adapter.addTransaction({ valor: 200, categoria: 'Contas', mes: 'Mar', data: '2026-03-10' });

    const data = adapter.getBudgetData();
    expect(data.expenses['Gastos Total']!.monthlyValues['Mar']).toBeCloseTo(-300, 5);
  });

  it('Req 3.3 — updates balance.monthlyValues for the affected month', () => {
    // Income is 0 in zeroed data, so balance = 0 + gastosTotal
    adapter.addTransaction({ valor: 150, categoria: 'Contas', mes: 'Abr', data: '2026-04-01' });

    const data = adapter.getBudgetData();
    expect(data.balance.monthlyValues['Abr']).toBeCloseTo(-150, 5);
  });

  it('Req 3.4 — category annual total equals sum of 12 monthly values', () => {
    adapter.addTransaction({ valor: 80, categoria: 'Farmácia', mes: 'Jan', data: '2026-01-05' });
    adapter.addTransaction({ valor: 60, categoria: 'Farmácia', mes: 'Jun', data: '2026-06-15' });

    const data = adapter.getBudgetData();
    const entry = data.expenses['Farmácia']!;
    const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
    expect(entry.total).toBeCloseTo(expectedTotal, 5);
  });

  it('Req 3.5 — balance annual total equals sum of 12 monthly balance values', () => {
    adapter.addTransaction({ valor: 100, categoria: 'Contas', mes: 'Jan', data: '2026-01-01' });
    adapter.addTransaction({ valor: 200, categoria: 'Contas', mes: 'Jul', data: '2026-07-01' });

    const data = adapter.getBudgetData();
    const expectedTotal = MONTHS.reduce((acc, m) => acc + data.balance.monthlyValues[m], 0);
    expect(data.balance.total).toBeCloseTo(expectedTotal, 5);
  });

  it('"Gastos Total" annual total equals sum of 12 monthly values', () => {
    adapter.addTransaction({ valor: 300, categoria: 'Compras', mes: 'Fev', data: '2026-02-20' });

    const data = adapter.getBudgetData();
    const entry = data.expenses['Gastos Total']!;
    const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
    expect(entry.total).toBeCloseTo(expectedTotal, 5);
  });
});

// ─── Recalculation after deleteTransaction ───────────────────────────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

describe('InMemoryAdapter — recalculation after deleteTransaction', () => {
  it('Req 3.1 — category monthlyValues decreases after deletion', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-10' });
    adapter.addTransaction({ valor: 50, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-20' });

    adapter.deleteTransaction(t1.id);

    const data = adapter.getBudgetData();
    // Only the 50 transaction remains → -50
    expect(data.expenses['Alimentação']!.monthlyValues['Jan']).toBeCloseTo(-50, 5);
  });

  it('Req 3.2 — "Gastos Total" is recalculated after deletion', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction({ valor: 200, categoria: 'Contas', mes: 'Mai', data: '2026-05-01' });
    adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Mai', data: '2026-05-05' });

    adapter.deleteTransaction(t1.id);

    const data = adapter.getBudgetData();
    // Only Alimentação 100 remains → -100
    expect(data.expenses['Gastos Total']!.monthlyValues['Mai']).toBeCloseTo(-100, 5);
  });

  it('Req 3.3 — balance is recalculated after deletion', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction({ valor: 300, categoria: 'Contas', mes: 'Jun', data: '2026-06-01' });

    adapter.deleteTransaction(t1.id);

    const data = adapter.getBudgetData();
    // No transactions left → balance = 0
    expect(data.balance.monthlyValues['Jun']).toBeCloseTo(0, 5);
  });

  it('Req 3.4 — category annual total is correct after deletion', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction({ valor: 100, categoria: 'Farmácia', mes: 'Jan', data: '2026-01-01' });
    adapter.addTransaction({ valor: 200, categoria: 'Farmácia', mes: 'Mar', data: '2026-03-01' });

    adapter.deleteTransaction(t1.id);

    const data = adapter.getBudgetData();
    const entry = data.expenses['Farmácia']!;
    const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
    expect(entry.total).toBeCloseTo(expectedTotal, 5);
    expect(entry.total).toBeCloseTo(-200, 5);
  });

  it('Req 3.5 — balance annual total is correct after deletion', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const t1 = adapter.addTransaction({ valor: 150, categoria: 'Contas', mes: 'Ago', data: '2026-08-01' });

    adapter.deleteTransaction(t1.id);

    const data = adapter.getBudgetData();
    const expectedTotal = MONTHS.reduce((acc, m) => acc + data.balance.monthlyValues[m], 0);
    expect(data.balance.total).toBeCloseTo(expectedTotal, 5);
    expect(data.balance.total).toBeCloseTo(0, 5);
  });
});

// ─── Recalculation after updateTransaction — month change ────────────────────
// Validates: Requirements 3.1, 3.2, 3.3

describe('InMemoryAdapter — recalculation after updateTransaction with month change', () => {
  it('Req 3.1 — old month and new month are both recalculated', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-10' });

    // Move transaction from Jan to Feb
    adapter.updateTransaction(created.id, { mes: 'Fev' });

    const data = adapter.getBudgetData();
    // Jan should now be 0 (transaction moved away)
    expect(data.expenses['Alimentação']!.monthlyValues['Jan']).toBeCloseTo(0, 5);
    // Feb should now be -100
    expect(data.expenses['Alimentação']!.monthlyValues['Fev']).toBeCloseTo(-100, 5);
  });

  it('Req 3.2 — "Gastos Total" is updated for both old and new month', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 250, categoria: 'Contas', mes: 'Mar', data: '2026-03-01' });

    adapter.updateTransaction(created.id, { mes: 'Abr' });

    const data = adapter.getBudgetData();
    expect(data.expenses['Gastos Total']!.monthlyValues['Mar']).toBeCloseTo(0, 5);
    expect(data.expenses['Gastos Total']!.monthlyValues['Abr']).toBeCloseTo(-250, 5);
  });

  it('Req 3.3 — balance is updated for both old and new month', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 400, categoria: 'Compras', mes: 'Mai', data: '2026-05-01' });

    adapter.updateTransaction(created.id, { mes: 'Jun' });

    const data = adapter.getBudgetData();
    expect(data.balance.monthlyValues['Mai']).toBeCloseTo(0, 5);
    expect(data.balance.monthlyValues['Jun']).toBeCloseTo(-400, 5);
  });

  it('annual totals are correct after month change', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 120, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-01' });

    adapter.updateTransaction(created.id, { mes: 'Dez' });

    const data = adapter.getBudgetData();
    const entry = data.expenses['Alimentação']!;
    const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
    expect(entry.total).toBeCloseTo(expectedTotal, 5);
    expect(entry.total).toBeCloseTo(-120, 5);
  });
});

// ─── Recalculation after updateTransaction — category change ─────────────────
// Validates: Requirements 3.1, 3.2

describe('InMemoryAdapter — recalculation after updateTransaction with category change', () => {
  it('Req 3.1 — old category and new category are both recalculated', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 75, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-05' });

    // Move transaction from Alimentação to Farmácia
    adapter.updateTransaction(created.id, { categoria: 'Farmácia' });

    const data = adapter.getBudgetData();
    // Alimentação Jan should now be 0
    expect(data.expenses['Alimentação']!.monthlyValues['Jan']).toBeCloseTo(0, 5);
    // Farmácia Jan should now be -75
    expect(data.expenses['Farmácia']!.monthlyValues['Jan']).toBeCloseTo(-75, 5);
  });

  it('Req 3.2 — "Gastos Total" remains consistent after category change', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 90, categoria: 'Contas', mes: 'Fev', data: '2026-02-01' });

    adapter.updateTransaction(created.id, { categoria: 'Compras' });

    const data = adapter.getBudgetData();
    // Gastos Total for Feb should still be -90 (same month, different category)
    expect(data.expenses['Gastos Total']!.monthlyValues['Fev']).toBeCloseTo(-90, 5);
    // Contas Feb should be 0
    expect(data.expenses['Contas']!.monthlyValues['Fev']).toBeCloseTo(0, 5);
    // Compras Feb should be -90
    expect(data.expenses['Compras']!.monthlyValues['Fev']).toBeCloseTo(-90, 5);
  });

  it('annual totals are correct after category change', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    const created = adapter.addTransaction({ valor: 60, categoria: 'Alimentação', mes: 'Mar', data: '2026-03-01' });

    adapter.updateTransaction(created.id, { categoria: 'Gastos Extras' });

    const data = adapter.getBudgetData();

    // Alimentação total should be 0
    const alimentacaoEntry = data.expenses['Alimentação']!;
    const alimentacaoExpected = MONTHS.reduce((acc, m) => acc + alimentacaoEntry.monthlyValues[m], 0);
    expect(alimentacaoEntry.total).toBeCloseTo(alimentacaoExpected, 5);
    expect(alimentacaoEntry.total).toBeCloseTo(0, 5);

    // Gastos Extras total should be -60
    const gastosExtrasEntry = data.expenses['Gastos Extras']!;
    const gastosExtrasExpected = MONTHS.reduce((acc, m) => acc + gastosExtrasEntry.monthlyValues[m], 0);
    expect(gastosExtrasEntry.total).toBeCloseTo(gastosExtrasExpected, 5);
    expect(gastosExtrasEntry.total).toBeCloseTo(-60, 5);
  });
});

// ─── Annual totals invariant ─────────────────────────────────────────────────
// Validates: Requirements 3.4, 3.5

describe('InMemoryAdapter — annual totals invariant (entry.total = sum of 12 monthly values)', () => {
  it('holds for all entries after a sequence of add/update/delete operations', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());

    // Add several transactions
    const t1 = adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-01' });
    const t2 = adapter.addTransaction({ valor: 200, categoria: 'Contas', mes: 'Mar', data: '2026-03-01' });
    adapter.addTransaction({ valor: 50, categoria: 'Farmácia', mes: 'Jun', data: '2026-06-01' });

    // Update one
    adapter.updateTransaction(t1.id, { mes: 'Fev', valor: 150 });

    // Delete one
    adapter.deleteTransaction(t2.id);

    const data = adapter.getBudgetData();

    const assertTotalEqualsSum = (entry: BudgetEntry) => {
      const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
      expect(entry.total).toBeCloseTo(expectedTotal, 5);
    };

    for (const entry of Object.values(data.income)) {
      assertTotalEqualsSum(entry);
    }
    for (const entry of Object.values(data.expenses)) {
      assertTotalEqualsSum(entry);
    }
    assertTotalEqualsSum(data.balance);

    // Spot-check specific values
    expect(data.expenses['Alimentação']!.monthlyValues['Jan']).toBeCloseTo(0, 5);
    expect(data.expenses['Alimentação']!.monthlyValues['Fev']).toBeCloseTo(-150, 5);
    expect(data.expenses['Contas']!.monthlyValues['Mar']).toBeCloseTo(0, 5);
    expect(data.expenses['Farmácia']!.monthlyValues['Jun']).toBeCloseTo(-50, 5);
  });

  it('Req 3.4 — income entry.total equals sum of 12 monthly values (unchanged by transactions)', () => {
    const adapter = new InMemoryAdapter(makeZeroedBudgetData());
    adapter.addTransaction({ valor: 100, categoria: 'Alimentação', mes: 'Jan', data: '2026-01-01' });

    const data = adapter.getBudgetData();
    for (const entry of Object.values(data.income)) {
      const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
      expect(entry.total).toBeCloseTo(expectedTotal, 5);
    }
  });
});
