import { describe, it, expect } from 'vitest';
import { fromMajorUnits, fromMinorUnits } from '../../../../shared/lib/money';
import {
  calculateVariance,
  formatVariancePercent,
} from '../variance';
import {
  getDaysInMonth,
  getMonthsForPeriod,
  getMonthsForQuarter,
  getQuarterForMonth,
  getYtdMonths,
  isLeapYear,
  matchesPeriodFilter,
  parseISODateParts,
} from '../periods';

describe('Variance Domain Module (§5.3, §5.4)', () => {
  it('computes variance = actual - budget and marks under-budget expenses as favorable', () => {
    const actual = fromMajorUnits(850, 'BRL');
    const budget = fromMajorUnits(1000, 'BRL');

    const result = calculateVariance(actual, budget, 'EXPENSE');

    expect(result.variance.amountMinor).toBe(-15000); // -R$ 150,00
    expect(result.variancePercent).toBeCloseTo(-15, 5);
    expect(result.status).toBe('favorable');
    expect(result.consumptionRatio).toBeCloseTo(0.85, 5);
    expect(result.formattedPercent).toMatch(/-15%/);
  });

  it('marks over-budget expenses as unfavorable', () => {
    const actual = fromMajorUnits(1250, 'BRL');
    const budget = fromMajorUnits(1000, 'BRL');

    const result = calculateVariance(actual, budget, 'EXPENSE');

    expect(result.variance.amountMinor).toBe(25000); // +R$ 250,00
    expect(result.variancePercent).toBeCloseTo(25, 5);
    expect(result.status).toBe('unfavorable');
    expect(result.consumptionRatio).toBeCloseTo(1.25, 5);
  });

  it('inverts favorable/unfavorable semantics for INCOME lines', () => {
    const overActual = fromMajorUnits(6000, 'BRL');
    const budget = fromMajorUnits(5000, 'BRL');

    const resOver = calculateVariance(overActual, budget, 'INCOME');
    expect(resOver.status).toBe('favorable');

    const underActual = fromMajorUnits(4500, 'BRL');
    const resUnder = calculateVariance(underActual, budget, 'INCOME');
    expect(resUnder.status).toBe('unfavorable');
  });

  it('explicitly handles budget = 0 with null percentage and "n/a" display (never Infinity or NaN)', () => {
    const actual = fromMajorUnits(500, 'BRL');
    const zeroBudget = fromMinorUnits(0, 'BRL');

    const result = calculateVariance(actual, zeroBudget, 'EXPENSE');

    expect(result.variance.amountMinor).toBe(50000);
    expect(result.variancePercent).toBeNull();
    expect(result.consumptionRatio).toBeNull();
    expect(result.formattedPercent).toBe('n/a');
    expect(formatVariancePercent(null)).toBe('n/a');
    expect(formatVariancePercent(Number.POSITIVE_INFINITY)).toBe('n/a');
    expect(formatVariancePercent(Number.NaN)).toBe('n/a');
  });
});

describe('Periods & Fiscal Calendar Domain Module (§5.5, §5.6)', () => {
  it('correctly identifies leap years and days in February', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);

    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2026, 2)).toBe(28);
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(getDaysInMonth(2026, 12)).toBe(31);
  });

  it('parses ISO dates without timezone drift at month boundaries and validates leap-day dates', () => {
    // End of month should never drift to April 1 or Feb 28 due to local timezone offset
    expect(parseISODateParts('2026-03-31')).toEqual({
      year: 2026,
      monthNumber: 3,
      month: 'Mar',
      day: 31,
    });
    expect(parseISODateParts('2024-02-29')).toEqual({
      year: 2024,
      monthNumber: 2,
      month: 'Fev',
      day: 29,
    });
    // 2026 is not a leap year -> Feb 29 is invalid
    expect(parseISODateParts('2026-02-29')).toBeNull();
  });

  it('resolves quarters, YTD months, and transaction period filtering across years', () => {
    expect(getMonthsForQuarter('Q1')).toEqual(['Jan', 'Fev', 'Mar']);
    expect(getMonthsForQuarter('Q4')).toEqual(['Out', 'Nov', 'Dez']);
    expect(getQuarterForMonth('Jan')).toBe('Q1');
    expect(getQuarterForMonth('Mai')).toBe('Q2');
    expect(getQuarterForMonth('Set')).toBe('Q3');
    expect(getQuarterForMonth('Dez')).toBe('Q4');

    expect(getYtdMonths('Abr')).toEqual(['Jan', 'Fev', 'Mar', 'Abr']);
    expect(getMonthsForPeriod({ mode: 'QUARTER', quarter: 'Q2' })).toEqual(['Abr', 'Mai', 'Jun']);
    expect(getMonthsForPeriod({ mode: 'MONTH', month: 'Set' })).toEqual(['Set']);

    const tx2026Q1 = { data: '2026-03-15', mes: 'Mar' as const };
    const tx2025Q1 = { data: '2025-03-15', mes: 'Mar' as const };

    expect(matchesPeriodFilter(tx2026Q1, { year: 2026, mode: 'QUARTER', quarter: 'Q1' })).toBe(true);
    expect(matchesPeriodFilter(tx2025Q1, { year: 2026, mode: 'QUARTER', quarter: 'Q1' })).toBe(false);
    expect(matchesPeriodFilter(tx2026Q1, { year: 2026, mode: 'QUARTER', quarter: 'Q2' })).toBe(false);
  });
});
