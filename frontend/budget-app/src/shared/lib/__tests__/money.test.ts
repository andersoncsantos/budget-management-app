import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CurrencyMismatchError,
  absMoney,
  addMoney,
  allocateMoney,
  compareMoney,
  equalsMoney,
  formatMoney,
  fromMajorUnits,
  fromMinorUnits,
  isZeroMoney,
  majorToMinor,
  minorToMajor,
  multiplyMoney,
  negateMoney,
  parseMoneyInput,
  roundToInteger,
  subtractMoney,
  sumMajorAsMinor,
  sumMoney,
  toMajorUnits,
  type Money,
} from '../money';

describe('Money Domain Module (§5.1, §5.2, §5.8)', () => {
  it('eliminates IEEE-754 floating-point drift (0.1 + 0.2 === 0.3)', () => {
    const a = fromMajorUnits(0.1, 'BRL');
    const b = fromMajorUnits(0.2, 'BRL');
    const sum = addMoney(a, b);

    expect(sum.amountMinor).toBe(30);
    expect(toMajorUnits(sum)).toBe(0.3);
    expect(sumMajorAsMinor([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it('enforces rounding policies: half-even (bankers rounding) vs half-up', () => {
    expect(roundToInteger(2.5, 'half-even')).toBe(2);
    expect(roundToInteger(3.5, 'half-even')).toBe(4);
    expect(roundToInteger(-2.5, 'half-even')).toBe(-2);
    expect(roundToInteger(-3.5, 'half-even')).toBe(-4);

    expect(roundToInteger(2.5, 'half-up')).toBe(3);
    expect(roundToInteger(3.5, 'half-up')).toBe(4);
    expect(roundToInteger(-2.5, 'half-up')).toBe(-3);
  });

  it('rejects mixing different currencies without explicit conversion', () => {
    const brl = fromMinorUnits(1000, 'BRL') as unknown as Money<'BRL'>;
    const usd = fromMinorUnits(1000, 'USD') as unknown as Money<'BRL'>;

    expect(() => addMoney(brl, usd)).toThrow(CurrencyMismatchError);
    expect(() => subtractMoney(brl, usd)).toThrow(CurrencyMismatchError);
    expect(() => compareMoney(brl, usd)).toThrow(CurrencyMismatchError);
    expect(() => sumMoney([brl, usd], 'BRL')).toThrow(CurrencyMismatchError);
  });

  it('supports arithmetic, comparison, negation, and absolute value operations', () => {
    const a = fromMinorUnits(1500, 'BRL');
    const b = fromMinorUnits(2500, 'BRL');

    expect(subtractMoney(a, b).amountMinor).toBe(-1000);
    expect(absMoney(subtractMoney(a, b)).amountMinor).toBe(1000);
    expect(negateMoney(a).amountMinor).toBe(-1500);
    expect(multiplyMoney(fromMinorUnits(1000, 'BRL'), 0.333, 'half-even').amountMinor).toBe(333);
    expect(compareMoney(a, b)).toBe(-1);
    expect(compareMoney(b, a)).toBe(1);
    expect(compareMoney(a, a)).toBe(0);
    expect(equalsMoney(a, fromMinorUnits(1500, 'BRL'))).toBe(true);
    expect(isZeroMoney(fromMinorUnits(0, 'BRL'))).toBe(true);
  });

  it('allocates money across periods/weights using largest-remainder method preserving exact sum', () => {
    // R$ 1,00 (100 centavos) split 3 equal ways -> 34, 33, 33
    const parts = allocateMoney(fromMinorUnits(100, 'BRL'), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([34, 33, 33]);
    expect(sumMoney(parts, 'BRL').amountMinor).toBe(100);

    // Negative total (-100 centavos) split 3 equal ways -> -34, -33, -33
    const negParts = allocateMoney(fromMinorUnits(-100, 'BRL'), [1, 1, 1]);
    expect(negParts.map((p) => p.amountMinor)).toEqual([-34, -33, -33]);
    expect(sumMoney(negParts, 'BRL').amountMinor).toBe(-100);
  });

  it('Property: allocateMoney always preserves the exact total in minor units for any total and positive weights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000_000, max: 100_000_000 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 24 }),
        (totalMinor, weights) => {
          const total = fromMinorUnits(totalMinor, 'BRL');
          const allocated = allocateMoney(total, weights);

          expect(allocated).toHaveLength(weights.length);
          const reSummed = sumMoney(allocated, 'BRL');
          expect(reSummed.amountMinor).toBe(total.amountMinor);
        }
      ),
      { numRuns: 150 }
    );
  });

  it('Property: majorToMinor and minorToMajor round-trip cleanly for integer minor units', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50_000_000, max: 50_000_000 }), (minor) => {
        const major = minorToMajor(minor, 'BRL');
        expect(majorToMinor(major, 'BRL')).toBe(minor);
      }),
      { numRuns: 150 }
    );
  });

  it('parses and formats BRL strings including accounting parentheses and compact notation', () => {
    expect(parseMoneyInput('R$ 1.234,56', 'BRL').amountMinor).toBe(123456);
    expect(parseMoneyInput('-1.234,56', 'BRL').amountMinor).toBe(-123456);
    expect(parseMoneyInput('1,234.56', 'USD').amountMinor).toBe(123456);
    expect(parseMoneyInput('', 'BRL').amountMinor).toBe(0);

    expect(formatMoney(fromMinorUnits(123456, 'BRL'))).toMatch(/R\$\s*1\.234,56/);
    expect(
      formatMoney(fromMinorUnits(-123456, 'BRL'), { accountingParentheses: true })
    ).toMatch(/\(R\$\s*1\.234,56\)/);
  });
});
