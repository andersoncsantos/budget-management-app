import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { InMemoryAdapter } from '../InMemoryAdapter';
import { budgetData } from '../../budgetData';
import type { Month, BudgetData, BudgetEntry } from '../../budgetData';
import type { Transaction } from '../IBudgetService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const MONTHS: Month[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const arbMonth = fc.constantFrom(...MONTHS);

// Use fc.double for 64-bit precision; fc.float requires 32-bit boundaries
const arbValor = fc.double({ min: 0.01, max: 999_999_999.99, noNaN: true });

// Use only categories that exist in the default budgetData so recalculation
// targets known expense buckets.
const KNOWN_CATEGORIES = [
  'Alimentação',
  'Cartão de Crédito',
  'Compras',
  'Contas',
  'Contas (Casa Erm.)',
  'Diversão',
  'Farmácia',
  'Gastos Extras',
  'Tarifas Bancárias',
  'Tom Penha',
  'Investimentos',
];

const arbCategoria = fc.constantFrom(...KNOWN_CATEGORIES);

const arbData = fc
  .date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
  .map(d => d.toISOString().slice(0, 10));

const arbTransactionInput = fc.record({
  valor: arbValor,
  categoria: arbCategoria,
  mes: arbMonth,
  data: arbData,
  descricao: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a zeroed-out BudgetData that has the same structure as budgetData
 * (same income/expense categories) but with all monthly values and totals set
 * to 0. This ensures that when we add transactions, the resulting values come
 * purely from those transactions — not from pre-existing seed data.
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

/**
 * Build an adapter pre-populated with the given transactions, starting from
 * a zeroed initial state so that all values derive purely from transactions.
 */
function adapterWithTransactions(
  transactions: Array<Omit<Transaction, 'id'>>
): InMemoryAdapter {
  const adapter = new InMemoryAdapter(makeZeroedBudgetData());
  for (const t of transactions) {
    adapter.addTransaction(t);
  }
  return adapter;
}

/**
 * Remove keys whose value is undefined from a patch object so that spreading
 * the patch does not accidentally overwrite existing fields with undefined.
 */
function cleanPatch<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ─── Property 2 ─────────────────────────────────────────────────────────────
// Feature: budget-app-improvements, Property 2: addTransaction increases list length by exactly 1
// Validates: Requirements 2.2

describe('InMemoryAdapter — Property-Based Tests', () => {
  it('Property 2: addTransaction increases list length by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 0, maxLength: 20 }),
        arbTransactionInput,
        (existing, newTx) => {
          const adapter = adapterWithTransactions(existing);
          const before = adapter.getTransactions().length;

          const created = adapter.addTransaction(newTx);
          const after = adapter.getTransactions().length;

          // Length must increase by exactly 1
          expect(after).toBe(before + 1);

          // The returned transaction must appear in the list
          const list = adapter.getTransactions();
          expect(list.some(t => t.id === created.id)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 4 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 4: updateTransaction reflects all updated fields
  // Validates: Requirements 2.9

  it('Property 4: updateTransaction reflects all updated fields', () => {
    fc.assert(
      fc.property(
        arbTransactionInput,
        // Partial patch — fields are individually optional; undefined means "absent"
        fc.record(
          {
            valor: fc.option(arbValor, { nil: undefined }),
            categoria: fc.option(arbCategoria, { nil: undefined }),
            mes: fc.option(arbMonth, { nil: undefined }),
            data: fc.option(arbData, { nil: undefined }),
            descricao: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
          },
          { requiredKeys: [] }
        ),
        (original, rawPatch) => {
          const adapter = new InMemoryAdapter(makeZeroedBudgetData());
          const created = adapter.addTransaction(original);

          // Strip undefined values so the patch truly omits those fields
          const patch = cleanPatch(rawPatch);

          const updated = adapter.updateTransaction(created.id, patch);

          // Every field present in patch must equal the patched value
          if (patch.valor !== undefined) expect(updated.valor).toBe(patch.valor);
          if (patch.categoria !== undefined) expect(updated.categoria).toBe(patch.categoria);
          if (patch.mes !== undefined) expect(updated.mes).toBe(patch.mes);
          if (patch.data !== undefined) expect(updated.data).toBe(patch.data);
          if (patch.descricao !== undefined) expect(updated.descricao).toBe(patch.descricao);

          // Every field absent from patch must retain its original value
          if (patch.valor === undefined) expect(updated.valor).toBe(created.valor);
          if (patch.categoria === undefined) expect(updated.categoria).toBe(created.categoria);
          if (patch.mes === undefined) expect(updated.mes).toBe(created.mes);
          if (patch.data === undefined) expect(updated.data).toBe(created.data);
          if (patch.descricao === undefined) expect(updated.descricao).toBe(created.descricao);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 5 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 5: deleteTransaction decreases list length by exactly 1
  // Validates: Requirements 2.12

  it('Property 5: deleteTransaction decreases list length by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 1, maxLength: 20 }),
        fc.nat(),
        (txInputs, indexSeed) => {
          const adapter = adapterWithTransactions(txInputs);
          const allBefore = adapter.getTransactions();
          const before = allBefore.length;

          // Pick a deterministic existing transaction to delete
          const target = allBefore[indexSeed % allBefore.length];

          adapter.deleteTransaction(target.id);
          const after = adapter.getTransactions();

          // Length must decrease by exactly 1
          expect(after.length).toBe(before - 1);

          // The deleted id must not appear in the resulting list
          expect(after.some(t => t.id === target.id)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 6 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 6: Category monthly values are consistent with transactions
  // Validates: Requirements 3.1

  it('Property 6: Category monthly values are consistent with transactions', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 0, maxLength: 30 }),
        (txInputs) => {
          const adapter = adapterWithTransactions(txInputs);
          const data = adapter.getBudgetData();
          const transactions = adapter.getTransactions();

          for (const cat of KNOWN_CATEGORIES) {
            for (const m of MONTHS) {
              const expectedSum = transactions
                .filter(t => t.categoria === cat && t.mes === m)
                .reduce((acc, t) => acc + t.valor, 0);

              const expectedValue = expectedSum === 0 ? 0 : -expectedSum;
              const actualValue = data.expenses[cat]?.monthlyValues[m] ?? 0;

              expect(actualValue).toBeCloseTo(expectedValue, 5);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 7 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 7: "Gastos Total" is the sum of all other category values per month
  // Validates: Requirements 3.2

  it('Property 7: "Gastos Total" is the sum of all other category values per month', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 0, maxLength: 30 }),
        (txInputs) => {
          const adapter = adapterWithTransactions(txInputs);
          const data = adapter.getBudgetData();

          for (const m of MONTHS) {
            const sumOfCategories = Object.entries(data.expenses)
              .filter(([cat]) => cat !== 'Gastos Total')
              .reduce((acc, [, entry]) => acc + entry.monthlyValues[m], 0);

            const gastosTotal = data.expenses['Gastos Total'].monthlyValues[m];

            expect(gastosTotal).toBeCloseTo(sumOfCategories, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 8 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 8: Balance monthly value equals income plus total expenses per month
  // Validates: Requirements 3.3

  it('Property 8: Balance monthly value equals income plus total expenses per month', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 0, maxLength: 30 }),
        (txInputs) => {
          const adapter = adapterWithTransactions(txInputs);
          const data = adapter.getBudgetData();

          for (const m of MONTHS) {
            const incomeTotal = Object.values(data.income).reduce(
              (acc, entry) => acc + entry.monthlyValues[m],
              0
            );

            const gastosTotal = data.expenses['Gastos Total'].monthlyValues[m];
            const expectedBalance = incomeTotal + gastosTotal;
            const actualBalance = data.balance.monthlyValues[m];

            expect(actualBalance).toBeCloseTo(expectedBalance, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Property 9 ───────────────────────────────────────────────────────────
  // Feature: budget-app-improvements, Property 9: Annual total equals sum of twelve monthly values for every BudgetEntry
  // Validates: Requirements 3.4, 3.5

  it('Property 9: Annual total equals sum of twelve monthly values for every BudgetEntry', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransactionInput, { minLength: 0, maxLength: 30 }),
        (txInputs) => {
          const adapter = adapterWithTransactions(txInputs);
          const data = adapter.getBudgetData();

          // Check all income entries
          for (const entry of Object.values(data.income)) {
            const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
            expect(entry.total).toBeCloseTo(expectedTotal, 5);
          }

          // Check all expense entries (including "Gastos Total")
          for (const entry of Object.values(data.expenses)) {
            const expectedTotal = MONTHS.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
            expect(entry.total).toBeCloseTo(expectedTotal, 5);
          }

          // Check balance entry
          const expectedBalanceTotal = MONTHS.reduce(
            (acc, m) => acc + data.balance.monthlyValues[m],
            0
          );
          expect(data.balance.total).toBeCloseTo(expectedBalanceTotal, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
