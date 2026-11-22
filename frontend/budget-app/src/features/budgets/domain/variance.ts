/**
 * Budget variance calculation and sign-convention domain module (§5.3, §5.4).
 *
 * Sign conventions:
 * - Individual transaction amounts (`Transaction.valor`) carry positive values for
 *   income and negative values for expenses in `BudgetContext`, while budget limits
 *   and variance comparisons operate on positive magnitudes (`actual` vs `budget`)
 *   with an explicit category kind (`'EXPENSE' | 'INCOME'`).
 * - `variance = actual − budget` (in integer minor units).
 * - `variancePercent = (variance / Math.abs(budget)) * 100`, with explicit handling
 *   when `budget.amountMinor === 0` (`variancePercent: null`, formatted as `"n/a"`).
 */

import {
  type CurrencyCode,
  type Money,
  subtractMoney,
  assertSameCurrency,
} from '../../../shared/lib/money';

export type BudgetLineKind = 'EXPENSE' | 'INCOME';

export type VarianceStatus = 'favorable' | 'unfavorable' | 'on_target';

export interface VarianceResult<C extends CurrencyCode = 'BRL'> {
  readonly actual: Money<C>;
  readonly budget: Money<C>;
  /** `actual - budget` in integer minor units. */
  readonly variance: Money<C>;
  /** `(variance / |budget|) * 100`, or `null` when `budget` is zero (§5.4). */
  readonly variancePercent: number | null;
  /** Formatted percentage string (`"n/a"` when `budget === 0`, never `Infinity`/`NaN`). */
  readonly formattedPercent: string;
  /** Semantic status accounting for income vs. expense direction (§5.3). */
  readonly status: VarianceStatus;
  /** Consumption ratio (`actual / budget`), or `null` when `budget === 0`. */
  readonly consumptionRatio: number | null;
}

/**
 * Formats a variance percentage, returning `"n/a"` when `variancePercent` is `null`
 * or non-finite (§5.4).
 *
 * @example
 * ```ts
 * formatVariancePercent(null)  // "n/a"
 * formatVariancePercent(12.5)  // "+12,5%"
 * formatVariancePercent(-8.25) // "-8,3%"
 * ```
 */
export function formatVariancePercent(
  variancePercent: number | null,
  locale = 'pt-BR',
  maximumFractionDigits = 1
): string {
  if (variancePercent === null || !Number.isFinite(variancePercent)) {
    return 'n/a';
  }
  const formatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
  return formatter.format(variancePercent / 100);
}

/**
 * Computes budget vs. actual variance in integer minor units (§5.3, §5.4).
 *
 * - `variance = actual - budget`
 * - For `'EXPENSE'` (default): spending less than budget (`actual < budget`, `variance < 0`)
 *   is `'favorable'`; spending more (`actual > budget`, `variance > 0`) is `'unfavorable'`.
 * - For `'INCOME'`: earning more than budget (`actual > budget`, `variance > 0`)
 *   is `'favorable'`; earning less (`actual < budget`, `variance < 0`) is `'unfavorable'`.
 * - When `budget.amountMinor === 0`, `variancePercent` and `consumptionRatio` are `null`
 *   and `formattedPercent` is `"n/a"`.
 *
 * @example
 * ```ts
 * const res = calculateVariance(fromMajorUnits(1100), fromMajorUnits(1000), 'EXPENSE');
 * res.variance.amountMinor // 10000 (+R$ 100,00)
 * res.variancePercent      // 10
 * res.status               // 'unfavorable'
 * ```
 */
export function calculateVariance<C extends CurrencyCode = 'BRL'>(
  actual: Money<C>,
  budget: Money<C>,
  kind: BudgetLineKind = 'EXPENSE',
  locale = 'pt-BR'
): VarianceResult<C> {
  assertSameCurrency(actual, budget);

  const variance = subtractMoney(actual, budget);
  const budgetMinor = budget.amountMinor;
  const actualMinor = actual.amountMinor;

  const variancePercent =
    budgetMinor === 0 ? null : (variance.amountMinor / Math.abs(budgetMinor)) * 100;

  const consumptionRatio =
    budgetMinor === 0 ? null : actualMinor / budgetMinor;

  let status: VarianceStatus = 'on_target';
  if (variance.amountMinor !== 0) {
    if (kind === 'EXPENSE') {
      status = variance.amountMinor < 0 ? 'favorable' : 'unfavorable';
    } else {
      status = variance.amountMinor > 0 ? 'favorable' : 'unfavorable';
    }
  }

  return {
    actual,
    budget,
    variance,
    variancePercent,
    formattedPercent: formatVariancePercent(variancePercent, locale),
    status,
    consumptionRatio,
  };
}
