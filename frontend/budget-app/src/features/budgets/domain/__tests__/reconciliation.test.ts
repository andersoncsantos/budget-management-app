import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { budgetData, type Month } from '../../../../budgetData';
import type { Transaction } from '../../../../services/IBudgetService';
import { majorToMinor } from '../../../../shared/lib/money';
import {
  ALL_MONTHS,
  TOTAL_EXPENSES_KEY,
  calculateBudgetMatrixFromTransactions,
  calculateCategoryDistribution,
  calculateKpiSummary,
  calculateMonthlySummary,
  calculateMonthlyTrend,
  isSyntheticTotalCategory,
  reconcileBudgetData,
} from '../../index';

describe('Financial Aggregation Integrity & Reconciliation (§5.7, §11)', () => {
  it('reconciles default seed budgetData across KPI cards, donut chart, monthly bar chart, and details table', () => {
    const data = reconcileBudgetData(budgetData);

    // 1. KPI Card Totals
    const kpis = calculateKpiSummary(data);

    // 2. Donut Chart (Category Distribution) Total
    const distribution = calculateCategoryDistribution(data);
    const donutTotalMinor = distribution.reduce((acc, item) => acc + majorToMinor(item.value), 0);

    // 3. Monthly Trend Bar Chart Totals
    const trend = calculateMonthlyTrend(data);
    const trendIncomeMinor = trend.reduce((acc, pt) => acc + majorToMinor(pt.Income), 0);
    const trendExpensesMinor = trend.reduce((acc, pt) => acc + majorToMinor(pt.Expenses), 0);
    const trendNetMinor = trend.reduce((acc, pt) => acc + majorToMinor(pt.Net), 0);

    // 4. Financial Details Matrix Table Totals
    const tableIncomeMinor = Object.values(data.income).reduce(
      (acc, entry) => acc + majorToMinor(entry.total),
      0
    );
    const tableCategoryExpensesMinor = Object.entries(data.expenses)
      .filter(([name]) => !isSyntheticTotalCategory(name))
      .reduce((acc, [, entry]) => acc + Math.abs(majorToMinor(entry.total)), 0);
    const tableGastosTotalMinor = Math.abs(
      majorToMinor(data.expenses[TOTAL_EXPENSES_KEY]?.total ?? 0)
    );
    const tableBalanceMinor = majorToMinor(data.balance.total);

    // Assert 100% reconciliation across all 4 surfaces
    const kpiIncomeMinor = majorToMinor(kpis.totalIncome);
    const kpiExpensesMinor = majorToMinor(kpis.totalExpenses);
    const kpiNetMinor = majorToMinor(kpis.netBalance);

    expect(kpiIncomeMinor).toBe(62000_00);
    expect(kpiExpensesMinor).toBe(43600_00);
    expect(kpiNetMinor).toBe(18400_00);

    expect(donutTotalMinor).toBe(kpiExpensesMinor);
    expect(trendExpensesMinor).toBe(kpiExpensesMinor);
    expect(tableCategoryExpensesMinor).toBe(kpiExpensesMinor);
    expect(tableGastosTotalMinor).toBe(kpiExpensesMinor);

    expect(trendIncomeMinor).toBe(kpiIncomeMinor);
    expect(tableIncomeMinor).toBe(kpiIncomeMinor);

    expect(trendNetMinor).toBe(kpiNetMinor);
    expect(tableBalanceMinor).toBe(kpiNetMinor);
  });

  it('Property: KPI Card Total === Donut Chart Total === Bar Chart Sum === Details Table Total for any transaction set and period filter', () => {
    const arbMonth = fc.constantFrom<Month>(...ALL_MONTHS);
    const arbCategory = fc.constantFrom(
      'Receita',
      'Salário',
      'Alimentação',
      'Contas',
      'Farmácia',
      'Compras',
      'Transporte'
    );

    const arbTransaction: fc.Arbitrary<Transaction> = fc
      .record({
        id: fc.uuid(),
        cents: fc.integer({ min: -500_000, max: 500_000 }).filter((n) => n !== 0),
        categoria: arbCategory,
        mes: arbMonth,
      })
      .map(({ id, cents, categoria, mes }) => {
        const monthIndex = String(ALL_MONTHS.indexOf(mes) + 1).padStart(2, '0');
        return {
          id,
          valor: cents / 100,
          categoria,
          mes,
          data: `2026-${monthIndex}-15`,
          descricao: 'Test transaction',
        };
      });

    fc.assert(
      fc.property(
        fc.array(arbTransaction, { minLength: 0, maxLength: 40 }),
        fc.subarray([...ALL_MONTHS], { minLength: 1, maxLength: 12 }),
        (transactions, activeMonths) => {
          const matrix = calculateBudgetMatrixFromTransactions(transactions, budgetData.metadata);

          // KPI Cards for activeMonths
          const kpis = calculateKpiSummary(matrix, activeMonths);
          const kpiIncomeMinor = majorToMinor(kpis.totalIncome);
          const kpiExpensesMinor = majorToMinor(kpis.totalExpenses);
          const kpiNetMinor = majorToMinor(kpis.netBalance);

          // Donut Chart for activeMonths
          const dist = calculateCategoryDistribution(matrix, activeMonths);
          const donutExpensesMinor = dist.reduce((acc, d) => acc + majorToMinor(d.value), 0);

          // Bar Chart for activeMonths
          const trend = calculateMonthlyTrend(matrix, activeMonths);
          const barIncomeMinor = trend.reduce((acc, t) => acc + majorToMinor(t.Income), 0);
          const barExpensesMinor = trend.reduce((acc, t) => acc + majorToMinor(t.Expenses), 0);
          const barNetMinor = trend.reduce((acc, t) => acc + majorToMinor(t.Net), 0);

          // Table Matrix for activeMonths
          let tableIncomeMinor = 0;
          let tableExpensesMinor = 0;
          let tableBalanceMinor = 0;
          for (const m of activeMonths) {
            const summary = calculateMonthlySummary(matrix, m);
            tableIncomeMinor += majorToMinor(summary.income);
            tableExpensesMinor += majorToMinor(summary.expenses);
            tableBalanceMinor += majorToMinor(summary.balance);
          }

          expect(donutExpensesMinor).toBe(kpiExpensesMinor);
          expect(barExpensesMinor).toBe(kpiExpensesMinor);
          expect(tableExpensesMinor).toBe(kpiExpensesMinor);

          expect(barIncomeMinor).toBe(kpiIncomeMinor);
          expect(tableIncomeMinor).toBe(kpiIncomeMinor);

          expect(barNetMinor).toBe(kpiNetMinor);
          expect(tableBalanceMinor).toBe(kpiNetMinor);
        }
      ),
      { numRuns: 100 }
    );
  });
});
