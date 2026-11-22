/**
 * Pure financial rollup and reconciliation domain module (§4.1, §5.1, §5.3, §5.7).
 *
 * All aggregations (KPI cards, category distribution donut chart, monthly trend bar chart,
 * and financial details matrix table) are computed in integer minor units (`centavos`)
 * from a single source of truth so totals always reconcile.
 */

import type { BudgetData, BudgetEntry, BudgetMetadata, Month } from '../../../budgetData';
import type { Transaction } from '../../../services/IBudgetService';
import { fromMinorUnits, majorToMinor, minorToMajor } from '../../../shared/lib/money';
import {
  ALL_MONTHS,
  getMonthsForQuarter,
  matchesPeriodFilter,
  parseISODateParts,
  type PeriodFilter,
  type Quarter,
} from './periods';
import { calculateVariance, formatVariancePercent, type VarianceStatus } from './variance';

export const TOTAL_EXPENSES_KEY = 'Gastos Total';

/**
 * Returns `true` if `categoryName` is a synthetic total row (`"Gastos Total"`).
 */
export function isSyntheticTotalCategory(categoryName: string): boolean {
  return categoryName === TOTAL_EXPENSES_KEY || categoryName.toLowerCase().includes('total');
}

/**
 * Creates a zero-initialized `Record<Month, number>` map.
 */
export function createEmptyMonthlyValues(): Record<Month, number> {
  return {
    Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0,
    Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0,
  };
}

/**
 * Normalizes and reconciles a `BudgetData` object using integer minor units (§5.1, §5.3, §5.7):
 * 1. Every income category monthly value is non-negative (`>= 0`) and its `.total` is the
 *    exact 12-month sum in integer minor units.
 * 2. Every individual expense category monthly value is stored using the negative sign
 *    convention (`<= 0`, or `0` when zero) and its `.total` is the exact 12-month sum.
 * 3. `expenses['Gastos Total']` is derived as the exact sum of all individual expense
 *    categories for each month and annually.
 * 4. `balance` is derived as `income + Gastos Total` for each month and annually.
 *
 * @example
 * ```ts
 * const reconciled = reconcileBudgetData(rawBudgetData);
 * ```
 */
export function reconcileBudgetData(raw: BudgetData): BudgetData {
  const income: Record<string, BudgetEntry> = {};
  const expenses: Record<string, BudgetEntry> = {};

  for (const [cat, entry] of Object.entries(raw.income)) {
    const monthlyValues = createEmptyMonthlyValues();
    let totalMinor = 0;
    for (const m of ALL_MONTHS) {
      const minor = Math.abs(majorToMinor(entry.monthlyValues[m] ?? 0));
      monthlyValues[m] = minorToMajor(minor);
      totalMinor += minor;
    }
    income[cat] = {
      monthlyValues,
      total: minorToMajor(totalMinor),
    };
  }

  for (const [cat, entry] of Object.entries(raw.expenses)) {
    if (isSyntheticTotalCategory(cat)) continue;
    const monthlyValues = createEmptyMonthlyValues();
    let totalMinor = 0;
    for (const m of ALL_MONTHS) {
      const absMinor = Math.abs(majorToMinor(entry.monthlyValues[m] ?? 0));
      const signedMinor = absMinor === 0 ? 0 : -absMinor;
      monthlyValues[m] = minorToMajor(signedMinor);
      totalMinor += signedMinor;
    }
    expenses[cat] = {
      monthlyValues,
      total: minorToMajor(totalMinor),
    };
  }

  const gastosTotalMonthly = createEmptyMonthlyValues();
  let gastosTotalAnnualMinor = 0;

  for (const m of ALL_MONTHS) {
    let monthExpenseMinor = 0;
    for (const [cat, entry] of Object.entries(expenses)) {
      if (isSyntheticTotalCategory(cat)) continue;
      monthExpenseMinor += majorToMinor(entry.monthlyValues[m]);
    }
    gastosTotalMonthly[m] = minorToMajor(monthExpenseMinor);
    gastosTotalAnnualMinor += monthExpenseMinor;
  }

  expenses[TOTAL_EXPENSES_KEY] = {
    monthlyValues: gastosTotalMonthly,
    total: minorToMajor(gastosTotalAnnualMinor),
  };

  const balanceMonthly = createEmptyMonthlyValues();
  let balanceAnnualMinor = 0;

  for (const m of ALL_MONTHS) {
    let monthIncomeMinor = 0;
    for (const entry of Object.values(income)) {
      monthIncomeMinor += majorToMinor(entry.monthlyValues[m]);
    }
    const monthExpenseMinor = majorToMinor(gastosTotalMonthly[m]);
    const monthBalanceMinor = monthIncomeMinor + monthExpenseMinor;
    balanceMonthly[m] = minorToMajor(monthBalanceMinor);
    balanceAnnualMinor += monthBalanceMinor;
  }

  return {
    metadata: { ...raw.metadata },
    income,
    expenses,
    balance: {
      monthlyValues: balanceMonthly,
      total: minorToMajor(balanceAnnualMinor),
    },
  };
}

/**
 * Builds a complete, reconciled `BudgetData` matrix from a list of transactions
 * using integer minor units (`centavos`), optionally filtered by `PeriodFilter`.
 *
 * @example
 * ```ts
 * const matrix = calculateBudgetMatrixFromTransactions(transactions, metadata);
 * ```
 */
export function calculateBudgetMatrixFromTransactions(
  transactions: readonly Transaction[],
  metadata: BudgetMetadata,
  filter?: PeriodFilter
): BudgetData {
  const incomeMinorByCat: Record<string, Record<Month, number>> = {};
  const expenseMinorByCat: Record<string, Record<Month, number>> = {};

  for (const tx of transactions) {
    if (!matchesPeriodFilter(tx, filter)) continue;
    if (isSyntheticTotalCategory(tx.categoria)) continue;

    const parsedDate = parseISODateParts(tx.data);
    const month: Month = parsedDate?.month ?? tx.mes;
    const amountMinor = majorToMinor(tx.valor);

    if (amountMinor > 0) {
      let bucket = incomeMinorByCat[tx.categoria];
      if (!bucket) {
        bucket = createEmptyMonthlyValues();
        incomeMinorByCat[tx.categoria] = bucket;
      }
      bucket[month] += amountMinor;
    } else if (amountMinor < 0) {
      let bucket = expenseMinorByCat[tx.categoria];
      if (!bucket) {
        bucket = createEmptyMonthlyValues();
        expenseMinorByCat[tx.categoria] = bucket;
      }
      bucket[month] += amountMinor; // negative minor units
    }
  }

  const income: Record<string, BudgetEntry> = {};
  for (const [cat, minorMap] of Object.entries(incomeMinorByCat)) {
    const monthlyValues = createEmptyMonthlyValues();
    let totalMinor = 0;
    for (const m of ALL_MONTHS) {
      monthlyValues[m] = minorToMajor(minorMap[m]);
      totalMinor += minorMap[m];
    }
    income[cat] = {
      monthlyValues,
      total: minorToMajor(totalMinor),
    };
  }

  const expenses: Record<string, BudgetEntry> = {};
  for (const [cat, minorMap] of Object.entries(expenseMinorByCat)) {
    const monthlyValues = createEmptyMonthlyValues();
    let totalMinor = 0;
    for (const m of ALL_MONTHS) {
      monthlyValues[m] = minorToMajor(minorMap[m]);
      totalMinor += minorMap[m];
    }
    expenses[cat] = {
      monthlyValues,
      total: minorToMajor(totalMinor),
    };
  }

  return reconcileBudgetData({
    metadata,
    income,
    expenses,
    balance: {
      monthlyValues: createEmptyMonthlyValues(),
      total: 0,
    },
  });
}

export interface MonthlySummary {
  /** Non-negative total income for the month (`>= 0`). */
  readonly income: number;
  /** Non-negative total expenses magnitude for the month (`>= 0`). */
  readonly expenses: number;
  /** Net balance (`income - expenses`). */
  readonly balance: number;
}

/**
 * Calculates the summary (`income`, `expenses`, `balance`) for a single `Month`
 * from `BudgetData` using integer minor units.
 *
 * @example
 * ```ts
 * calculateMonthlySummary(data, 'Mar') // { income: 5000, expenses: 3900, balance: 1100 }
 * ```
 */
export function calculateMonthlySummary(data: BudgetData, month: Month): MonthlySummary {
  let incomeMinor = 0;
  for (const entry of Object.values(data.income)) {
    incomeMinor += Math.abs(majorToMinor(entry.monthlyValues[month] ?? 0));
  }

  let expensesMinor = 0;
  for (const [cat, entry] of Object.entries(data.expenses)) {
    if (isSyntheticTotalCategory(cat)) continue;
    expensesMinor += Math.abs(majorToMinor(entry.monthlyValues[month] ?? 0));
  }

  const balanceMinor = incomeMinor - expensesMinor;

  return {
    income: minorToMajor(incomeMinor),
    expenses: minorToMajor(expensesMinor),
    balance: minorToMajor(balanceMinor),
  };
}

export interface CategoryDistributionItem {
  readonly name: string;
  /** Positive major-unit value (backed by integer minor units). */
  readonly value: number;
  /** Share of total expenses (`0..100`). */
  readonly percentage: number;
}

/**
 * Computes the expense category distribution from `BudgetData` across the selected `months`
 * (defaults to all 12 months) using integer minor units (§5.7).
 *
 * Guarantees that `sum(items.map(i => majorToMinor(i.value)))` equals total expenses minor units.
 *
 * @example
 * ```ts
 * const dist = calculateCategoryDistribution(data);
 * ```
 */
export function calculateCategoryDistribution(
  data: BudgetData,
  months: readonly Month[] = ALL_MONTHS
): CategoryDistributionItem[] {
  const minorByCategory: { name: string; minor: number }[] = [];
  let totalExpensesMinor = 0;

  for (const [cat, entry] of Object.entries(data.expenses)) {
    if (isSyntheticTotalCategory(cat)) continue;
    let catMinor = 0;
    for (const m of months) {
      catMinor += Math.abs(majorToMinor(entry.monthlyValues[m] ?? 0));
    }
    if (catMinor > 0) {
      minorByCategory.push({ name: cat, minor: catMinor });
      totalExpensesMinor += catMinor;
    }
  }

  if (totalExpensesMinor === 0) {
    return [];
  }

  return minorByCategory
    .sort((a, b) => b.minor - a.minor || a.name.localeCompare(b.name))
    .map(({ name, minor }) => ({
      name,
      value: minorToMajor(minor),
      percentage: (minor / totalExpensesMinor) * 100,
    }));
}

export interface MonthlyTrendPoint {
  readonly name: Month;
  readonly Income: number;
  readonly Expenses: number;
  readonly Net: number;
}

/**
 * Computes the monthly income vs. expense trend series from `BudgetData` in integer minor units.
 *
 * @example
 * ```ts
 * const trend = calculateMonthlyTrend(data);
 * ```
 */
export function calculateMonthlyTrend(
  data: BudgetData,
  months: readonly Month[] = ALL_MONTHS
): MonthlyTrendPoint[] {
  return months.map((month) => {
    const summary = calculateMonthlySummary(data, month);
    return {
      name: month,
      Income: summary.income,
      Expenses: summary.expenses,
      Net: summary.balance,
    };
  });
}

export interface KpiSummary {
  /** Total income across the active months (`>= 0`). */
  readonly totalIncome: number;
  /** Total expenses magnitude across the active months (`>= 0`). */
  readonly totalExpenses: number;
  /** Net balance (`totalIncome - totalExpenses`). */
  readonly netBalance: number;
}

/**
 * Computes the top-level KPI summary (`totalIncome`, `totalExpenses`, `netBalance`)
 * from `BudgetData` across `months` (defaults to all 12 months) using integer minor units.
 *
 * Guarantees reconciliation with `calculateMonthlyTrend` and `calculateCategoryDistribution` (§5.7).
 *
 * @example
 * ```ts
 * const kpis = calculateKpiSummary(data);
 * ```
 */
export function calculateKpiSummary(
  data: BudgetData,
  months: readonly Month[] = ALL_MONTHS
): KpiSummary {
  let incomeMinor = 0;
  let expensesMinor = 0;

  for (const m of months) {
    for (const entry of Object.values(data.income)) {
      incomeMinor += Math.abs(majorToMinor(entry.monthlyValues[m] ?? 0));
    }
    for (const [cat, entry] of Object.entries(data.expenses)) {
      if (isSyntheticTotalCategory(cat)) continue;
      expensesMinor += Math.abs(majorToMinor(entry.monthlyValues[m] ?? 0));
    }
  }

  return {
    totalIncome: minorToMajor(incomeMinor),
    totalExpenses: minorToMajor(expensesMinor),
    netBalance: minorToMajor(incomeMinor - expensesMinor),
  };
}

/**
 * Caps a category distribution list at `maxSegments` (default 6 per §7.1 & Appendix B)
 * by grouping remaining tail categories into `"Outras Categorias"` in integer minor units.
 *
 * Preserves the exact total (`sum(items) === totalExpenses`).
 */
export function groupDonutDistribution(
  distribution: readonly CategoryDistributionItem[],
  maxSegments = 6
): CategoryDistributionItem[] {
  if (distribution.length <= maxSegments || maxSegments < 2) {
    return [...distribution];
  }

  const totalMinor = distribution.reduce((acc, item) => acc + majorToMinor(item.value), 0);
  if (totalMinor === 0) return [];

  const headCount = maxSegments - 1;
  const head = distribution.slice(0, headCount);
  const tail = distribution.slice(headCount);

  const tailMinor = tail.reduce((acc, item) => acc + majorToMinor(item.value), 0);
  if (tailMinor <= 0) {
    return [...head];
  }

  return [
    ...head,
    {
      name: 'Outras Categorias',
      value: minorToMajor(tailMinor),
      percentage: (tailMinor / totalMinor) * 100,
    },
  ];
}

export interface PeriodDeltaInfo {
  readonly direction: 'up' | 'down' | 'neutral';
  readonly tone: 'positive' | 'negative' | 'neutral';
  readonly label: string;
}

export interface DashboardPeriodComparison {
  readonly incomeDelta: PeriodDeltaInfo;
  readonly expensesDelta: PeriodDeltaInfo;
  readonly netDelta: PeriodDeltaInfo;
}

const QUARTERS_ORDER: readonly Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

/**
 * Computes period-over-period comparison deltas and savings rate in integer minor units
 * for the Dashboard KPI cards (§5.3, §5.4, §6.1).
 */
export function calculateDashboardComparison(
  data: BudgetData,
  period: 'YEAR' | Quarter | Month,
  activeMonths: readonly Month[]
): DashboardPeriodComparison {
  const currentKpis = calculateKpiSummary(data, activeMonths);
  const currentIncomeMinor = majorToMinor(currentKpis.totalIncome);
  const currentExpensesMinor = majorToMinor(currentKpis.totalExpenses);
  const currentNetMinor = majorToMinor(currentKpis.netBalance);

  // Savings rate delta for Net Balance card
  const savingsRatePercent =
    currentIncomeMinor > 0 ? (currentNetMinor / currentIncomeMinor) * 100 : null;
  const netDelta: PeriodDeltaInfo =
    savingsRatePercent === null
      ? {
          direction: 'neutral',
          tone: 'neutral',
          label: 'Taxa de poupança: n/a',
        }
      : {
          direction: currentNetMinor > 0 ? 'up' : currentNetMinor < 0 ? 'down' : 'neutral',
          tone: currentNetMinor > 0 ? 'positive' : currentNetMinor < 0 ? 'negative' : 'neutral',
          label: `Taxa de poupança: ${formatVariancePercent(savingsRatePercent)} da receita`,
        };

  let previousMonths: readonly Month[] | null = null;
  let comparisonLabel = '';

  if ((ALL_MONTHS as readonly string[]).includes(period)) {
    const idx = ALL_MONTHS.indexOf(period as Month);
    if (idx > 0) {
      const prevMonth = ALL_MONTHS[idx - 1];
      if (prevMonth) {
        previousMonths = [prevMonth];
        comparisonLabel = `vs. ${prevMonth}`;
      }
    }
  } else if ((QUARTERS_ORDER as readonly string[]).includes(period)) {
    const qIdx = QUARTERS_ORDER.indexOf(period as Quarter);
    if (qIdx > 0) {
      const prevQuarter = QUARTERS_ORDER[qIdx - 1];
      if (prevQuarter) {
        previousMonths = getMonthsForQuarter(prevQuarter);
        comparisonLabel = `vs. ${prevQuarter}`;
      }
    }
  }

  if (!previousMonths) {
    const monthCount = Math.max(activeMonths.length, 1);
    const avgIncome = minorToMajor(Math.round(currentIncomeMinor / monthCount));
    const avgExpenses = minorToMajor(Math.round(currentExpensesMinor / monthCount));
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      incomeDelta: {
        direction: currentIncomeMinor > 0 ? 'up' : 'neutral',
        tone: 'positive',
        label: `Média mensal: ${fmt.format(avgIncome)}`,
      },
      expensesDelta: {
        direction: currentExpensesMinor > 0 ? 'down' : 'neutral',
        tone: 'neutral',
        label: `Média mensal: ${fmt.format(avgExpenses)}`,
      },
      netDelta,
    };
  }

  const prevKpis = calculateKpiSummary(data, previousMonths);
  const incomeVar = calculateVariance(
    fromMinorUnits(currentIncomeMinor, 'BRL'),
    fromMinorUnits(majorToMinor(prevKpis.totalIncome), 'BRL'),
    'INCOME'
  );
  const expensesVar = calculateVariance(
    fromMinorUnits(currentExpensesMinor, 'BRL'),
    fromMinorUnits(majorToMinor(prevKpis.totalExpenses), 'BRL'),
    'EXPENSE'
  );

  const incomeDelta: PeriodDeltaInfo = {
    direction:
      incomeVar.variance.amountMinor > 0
        ? 'up'
        : incomeVar.variance.amountMinor < 0
          ? 'down'
          : 'neutral',
    tone:
      incomeVar.status === 'favorable'
        ? 'positive'
        : incomeVar.status === 'unfavorable'
          ? 'negative'
          : 'neutral',
    label: `${incomeVar.formattedPercent} ${comparisonLabel}`,
  };

  const expensesDelta: PeriodDeltaInfo = {
    direction:
      expensesVar.variance.amountMinor > 0
        ? 'up'
        : expensesVar.variance.amountMinor < 0
          ? 'down'
          : 'neutral',
    tone:
      expensesVar.status === 'favorable'
        ? 'positive'
        : expensesVar.status === 'unfavorable'
          ? 'negative'
          : 'neutral',
    label: `${expensesVar.formattedPercent} ${comparisonLabel}`,
  };

  return {
    incomeDelta,
    expensesDelta,
    netDelta,
  };
}

export interface CategoryConsumptionRow {
  readonly category: string;
  /** Actual spend in major units (`>= 0`). */
  readonly actual: number;
  /** Target/budget benchmark for the active period in major units (`>= 0`). */
  readonly target: number;
  /** `actual - target` in major units. */
  readonly variance: number;
  /** `(actual - target) / target * 100`, or `null` when `target === 0`. */
  readonly variancePercent: number | null;
  readonly formattedVariancePercent: string;
  /** Share of total period expenses (`0..100`). */
  readonly shareOfTotalPercent: number;
  /** Consumption percentage against target (`0..100+`). */
  readonly consumptionPercent: number;
  readonly status: VarianceStatus;
}

/**
 * Computes per-category budget consumption and variance rows for the active period (§5.4, §6.1).
 *
 * Uses explicit category budget limits when provided (`monthlyLimitByCategory`), or falls back
 * to the category's proportional annual monthly baseline (`(annualTotal / 12) * activeMonths.length`).
 */
export function calculateCategoryConsumptionRows(
  data: BudgetData,
  activeMonths: readonly Month[] = ALL_MONTHS,
  monthlyLimitByCategory: Readonly<Record<string, number>> = {}
): CategoryConsumptionRow[] {
  const distribution = calculateCategoryDistribution(data, activeMonths);
  if (distribution.length === 0) return [];

  const monthCount = Math.max(activeMonths.length, 1);

  return distribution.map((item) => {
    const actualMinor = majorToMinor(item.value);
    const entry = data.expenses[item.name];
    const annualEntryMinor = Math.abs(majorToMinor(entry?.total ?? 0));

    const explicitMonthlyLimit = monthlyLimitByCategory[item.name];
    const targetMinor =
      explicitMonthlyLimit !== undefined && explicitMonthlyLimit > 0
        ? majorToMinor(explicitMonthlyLimit) * monthCount
        : Math.round((annualEntryMinor / 12) * monthCount);

    const varResult = calculateVariance(
      fromMinorUnits(actualMinor, 'BRL'),
      fromMinorUnits(targetMinor, 'BRL'),
      'EXPENSE'
    );

    const consumptionPercent =
      varResult.consumptionRatio !== null ? varResult.consumptionRatio * 100 : 0;

    return {
      category: item.name,
      actual: minorToMajor(actualMinor),
      target: minorToMajor(targetMinor),
      variance: minorToMajor(varResult.variance.amountMinor),
      variancePercent: varResult.variancePercent,
      formattedVariancePercent: varResult.formattedPercent,
      shareOfTotalPercent: item.percentage,
      consumptionPercent,
      status: varResult.status,
    };
  });
}
