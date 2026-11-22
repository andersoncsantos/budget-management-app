import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Month } from '../../budgetData';
import {
  ALL_MONTHS,
  getMonthsForQuarter,
  type PeriodFilter,
  type Quarter,
} from '../../features/budgets';

export type PortalPeriodCode = 'YEAR' | Quarter | Month;

const VALID_QUARTERS: readonly Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function isQuarter(code: string): code is Quarter {
  return (VALID_QUARTERS as readonly string[]).includes(code);
}

export function isMonth(code: string): code is Month {
  return (ALL_MONTHS as readonly string[]).includes(code);
}

export function parsePortalPeriodCode(raw: string | null): PortalPeriodCode {
  if (!raw) return 'YEAR';
  if (raw === 'YEAR') return 'YEAR';
  if (isQuarter(raw)) return raw;
  if (isMonth(raw)) return raw;
  return 'YEAR';
}

export function resolveActiveMonths(period: PortalPeriodCode): readonly Month[] {
  if (period === 'YEAR') return ALL_MONTHS;
  if (isQuarter(period)) return getMonthsForQuarter(period);
  return [period];
}

export function formatPeriodLabel(period: PortalPeriodCode, year = 2026): string {
  if (period === 'YEAR') return `Jan–Dez ${year}`;
  if (isQuarter(period)) {
    const qMonths = getMonthsForQuarter(period);
    return `${period} (${qMonths[0]}–${qMonths[qMonths.length - 1]} ${year})`;
  }
  return `${period} ${year}`;
}

export function toPeriodFilter(period: PortalPeriodCode, year?: number): PeriodFilter {
  if (period === 'YEAR') {
    return { year, mode: 'YEAR' };
  }
  if (isQuarter(period)) {
    return { year, mode: 'QUARTER', quarter: period };
  }
  return { year, mode: 'MONTH', month: period };
}

/**
 * Synchronizes global period (`?period=YEAR|Q1..Q4|Jan..Dez`) and search query (`?q=...`)
 * with URL search params so every dashboard, matrix, and statement view is shareable
 * and back-button safe (§3.1, §6.1).
 */
export function usePortalUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const period: PortalPeriodCode = parsePortalPeriodCode(searchParams.get('period'));
  const globalQuery: string = searchParams.get('q') ?? '';

  const activeMonths = useMemo(() => resolveActiveMonths(period), [period]);
  const periodLabel = useMemo(() => formatPeriodLabel(period, 2026), [period]);

  const setPeriod = useCallback(
    (nextPeriod: PortalPeriodCode) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextPeriod === 'YEAR') {
            next.delete('period');
          } else {
            next.set('period', nextPeriod);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setGlobalQuery = useCallback(
    (nextQuery: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!nextQuery) {
            next.delete('q');
          } else {
            next.set('q', nextQuery);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return {
    period,
    activeMonths,
    periodLabel,
    globalQuery,
    setPeriod,
    setGlobalQuery,
    searchParams,
    setSearchParams,
  };
}
