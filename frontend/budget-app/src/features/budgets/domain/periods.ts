/**
 * Fiscal & calendar period domain functions (§5.5, §5.6).
 *
 * Pure TypeScript module with zero React dependencies.
 * All ISO date operations parse `YYYY-MM-DD` components directly (or in UTC)
 * so end-of-month dates never drift across user timezones.
 */

import type { Month } from '../../../budgetData';

export const ALL_MONTHS: readonly Month[] = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const QUARTER_MONTHS: Readonly<Record<Quarter, readonly Month[]>> = {
  Q1: ['Jan', 'Fev', 'Mar'],
  Q2: ['Abr', 'Mai', 'Jun'],
  Q3: ['Jul', 'Ago', 'Set'],
  Q4: ['Out', 'Nov', 'Dez'],
};

export interface ParsedISODate {
  readonly year: number;
  /** 1-based month index (1 = Jan, 12 = Dez) */
  readonly monthNumber: number;
  readonly month: Month;
  readonly day: number;
}

export interface PeriodFilter {
  readonly year?: number;
  readonly mode?: 'YEAR' | 'QUARTER' | 'MONTH' | 'YTD';
  readonly quarter?: Quarter;
  readonly month?: Month;
}

/**
 * Returns `true` if `year` is a Gregorian leap year (§5.5).
 *
 * @example
 * ```ts
 * isLeapYear(2024) // true
 * isLeapYear(2026) // false
 * isLeapYear(2000) // true
 * isLeapYear(1900) // false
 * ```
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the exact number of days in a given 1-based month (`1..12`) for `year`,
 * accounting for leap years.
 *
 * @example
 * ```ts
 * getDaysInMonth(2024, 2) // 29
 * getDaysInMonth(2026, 2) // 28
 * ```
 */
export function getDaysInMonth(year: number, monthNumber: number): number {
  if (monthNumber < 1 || monthNumber > 12 || !Number.isInteger(monthNumber)) {
    throw new RangeError(`Invalid monthNumber: ${monthNumber} (expected 1..12)`);
  }
  switch (monthNumber) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Parses an ISO date string (`YYYY-MM-DD` or ISO timestamp) without local-timezone shift (§5.6).
 *
 * @example
 * ```ts
 * parseISODateParts('2026-03-31')
 * // -> { year: 2026, monthNumber: 3, month: 'Mar', day: 31 }
 * ```
 */
export function parseISODateParts(dateStr: string): ParsedISODate | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number.parseInt(match[1] ?? '', 10);
  const monthNumber = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);

  if (
    !Number.isInteger(year) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    day < 1 ||
    day > getDaysInMonth(year, monthNumber)
  ) {
    return null;
  }

  const month = ALL_MONTHS[monthNumber - 1];
  if (!month) return null;

  return { year, monthNumber, month, day };
}

/**
 * Returns the 3 months belonging to a fiscal quarter (`Q1`..`Q4`).
 *
 * @example
 * ```ts
 * getMonthsForQuarter('Q1') // ['Jan', 'Fev', 'Mar']
 * ```
 */
export function getMonthsForQuarter(quarter: Quarter): readonly Month[] {
  return QUARTER_MONTHS[quarter];
}

/**
 * Returns the quarter (`Q1`..`Q4`) containing `month`.
 *
 * @example
 * ```ts
 * getQuarterForMonth('Abr') // 'Q2'
 * ```
 */
export function getQuarterForMonth(month: Month): Quarter {
  const idx = ALL_MONTHS.indexOf(month);
  if (idx < 3) return 'Q1';
  if (idx < 6) return 'Q2';
  if (idx < 9) return 'Q3';
  return 'Q4';
}

/**
 * Returns all months from `Jan` through `upToMonth` inclusive (Year-To-Date).
 *
 * @example
 * ```ts
 * getYtdMonths('Mar') // ['Jan', 'Fev', 'Mar']
 * ```
 */
export function getYtdMonths(upToMonth: Month): readonly Month[] {
  const idx = ALL_MONTHS.indexOf(upToMonth);
  if (idx === -1) return ALL_MONTHS;
  return ALL_MONTHS.slice(0, idx + 1);
}

/**
 * Resolves the active list of `Month`s for a `PeriodFilter`.
 *
 * @example
 * ```ts
 * getMonthsForPeriod({ mode: 'QUARTER', quarter: 'Q2' }) // ['Abr', 'Mai', 'Jun']
 * ```
 */
export function getMonthsForPeriod(filter?: PeriodFilter): readonly Month[] {
  if (!filter || !filter.mode || filter.mode === 'YEAR') {
    return ALL_MONTHS;
  }
  if (filter.mode === 'QUARTER' && filter.quarter) {
    return getMonthsForQuarter(filter.quarter);
  }
  if (filter.mode === 'MONTH' && filter.month) {
    return [filter.month];
  }
  if (filter.mode === 'YTD' && filter.month) {
    return getYtdMonths(filter.month);
  }
  return ALL_MONTHS;
}

/**
 * Checks whether a transaction (`date` ISO string and fallback `mes`) matches a `PeriodFilter`.
 *
 * @example
 * ```ts
 * matchesPeriodFilter({ data: '2026-03-15', mes: 'Mar' }, { year: 2026, mode: 'QUARTER', quarter: 'Q1' }) // true
 * ```
 */
export function matchesPeriodFilter(
  tx: { readonly data: string; readonly mes: Month },
  filter?: PeriodFilter
): boolean {
  if (!filter) return true;

  const parsed = parseISODateParts(tx.data);
  if (filter.year !== undefined && parsed !== null && parsed.year !== filter.year) {
    return false;
  }

  const effectiveMonth = parsed?.month ?? tx.mes;
  const activeMonths = getMonthsForPeriod(filter);
  return activeMonths.includes(effectiveMonth);
}
