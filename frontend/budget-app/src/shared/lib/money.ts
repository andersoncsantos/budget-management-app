/**
 * Pure financial money representation using integer minor units (§5.1, §5.2, §5.8).
 *
 * Every monetary calculation in the portal MUST go through integer minor units
 * (e.g., centavos for BRL) with an explicit ISO 4217 currency code.
 */

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export type RoundingMode = 'half-even' | 'half-up';

export interface Money<C extends CurrencyCode = 'BRL'> {
  /** Integer minor units (e.g. R$ 10,50 -> 1050 centavos). Guaranteed safe integer. */
  readonly amountMinor: number;
  /** Explicit ISO 4217 currency code. */
  readonly currency: C;
}

const CURRENCY_DECIMALS: Readonly<Record<CurrencyCode, number>> = {
  BRL: 2,
  USD: 2,
  EUR: 2,
};

export class CurrencyMismatchError extends Error {
  constructor(expected: CurrencyCode, received: CurrencyCode) {
    super(`Cannot mix currencies without explicit conversion: expected ${expected}, received ${received}`);
    this.name = 'CurrencyMismatchError';
  }
}

/**
 * Normalizes `-0` to `0`.
 */
function normalizeZero(n: number): number {
  return Object.is(n, -0) || n === 0 ? 0 : n;
}

/**
 * Rounds a real number to the nearest integer using the single project rounding policy (§5.2).
 *
 * - `'half-even'` (Banker's rounding, default): ties round to the nearest even integer.
 * - `'half-up'`: ties round away from zero.
 *
 * @example
 * ```ts
 * roundToInteger(2.5, 'half-even') // 2
 * roundToInteger(3.5, 'half-even') // 4
 * roundToInteger(2.5, 'half-up')   // 3
 * ```
 */
export function roundToInteger(value: number, mode: RoundingMode = 'half-even'): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot round non-finite number: ${value}`);
  }
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const diff = abs - floor;
  const EPSILON = 1e-9;

  if (Math.abs(diff - 0.5) <= EPSILON) {
    if (mode === 'half-up') {
      return normalizeZero(sign * (floor + 1));
    }
    // half-even: round to nearest even integer
    const roundedAbs = floor % 2 === 0 ? floor : floor + 1;
    return normalizeZero(sign * roundedAbs);
  }

  return normalizeZero(sign * Math.round(abs));
}

/**
 * Creates a `Money` value object directly from integer minor units (e.g., centavos).
 *
 * @example
 * ```ts
 * const m = fromMinorUnits(12345, 'BRL'); // R$ 123,45
 * ```
 */
export function fromMinorUnits<C extends CurrencyCode = 'BRL'>(
  amountMinor: number,
  currency: C = 'BRL' as C,
  rounding: RoundingMode = 'half-even'
): Money<C> {
  const intMinor = Number.isInteger(amountMinor)
    ? normalizeZero(amountMinor)
    : roundToInteger(amountMinor, rounding);
  return {
    amountMinor: intMinor,
    currency,
  };
}

/**
 * Converts a major-unit decimal number (e.g. `123.45`) into a `Money` value object
 * backed by integer minor units (`12345`).
 *
 * @example
 * ```ts
 * const m = fromMajorUnits(150.75, 'BRL');
 * m.amountMinor // 15075
 * ```
 */
export function fromMajorUnits<C extends CurrencyCode = 'BRL'>(
  amountMajor: number,
  currency: C = 'BRL' as C,
  rounding: RoundingMode = 'half-even'
): Money<C> {
  if (!Number.isFinite(amountMajor)) {
    throw new RangeError(`Invalid monetary major amount: ${amountMajor}`);
  }
  const decimals = CURRENCY_DECIMALS[currency];
  const factor = 10 ** decimals;
  const scaled = amountMajor * factor;
  return {
    amountMinor: roundToInteger(scaled, rounding),
    currency,
  };
}

/**
 * Converts a `Money` value object back into major units for legacy DTOs or chart axes.
 *
 * @example
 * ```ts
 * toMajorUnits(fromMinorUnits(15075, 'BRL')) // 150.75
 * ```
 */
export function toMajorUnits(money: Money<CurrencyCode>): number {
  const decimals = CURRENCY_DECIMALS[money.currency];
  const factor = 10 ** decimals;
  return normalizeZero(money.amountMinor / factor);
}

/**
 * Converts a major-unit number directly to integer minor units (BRL centavos by default).
 *
 * @example
 * ```ts
 * majorToMinor(19.99) // 1999
 * ```
 */
export function majorToMinor(
  amountMajor: number,
  currency: CurrencyCode = 'BRL',
  rounding: RoundingMode = 'half-even'
): number {
  return fromMajorUnits(amountMajor, currency, rounding).amountMinor;
}

/**
 * Converts integer minor units directly to major units (BRL by default).
 *
 * @example
 * ```ts
 * minorToMajor(1999) // 19.99
 * ```
 */
export function minorToMajor(amountMinor: number, currency: CurrencyCode = 'BRL'): number {
  return toMajorUnits(fromMinorUnits(amountMinor, currency));
}

/**
 * Runtime guard asserting two `Money` values share the same currency code.
 */
export function assertSameCurrency<C extends CurrencyCode>(
  a: Money<C>,
  b: Money<CurrencyCode>
): asserts b is Money<C> {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

/**
 * Adds two `Money` values of the same currency in integer minor units.
 *
 * @example
 * ```ts
 * addMoney(fromMajorUnits(0.1), fromMajorUnits(0.2)).amountMinor // 30
 * ```
 */
export function addMoney<C extends CurrencyCode>(a: Money<C>, b: Money<C>): Money<C> {
  assertSameCurrency(a, b);
  return fromMinorUnits(a.amountMinor + b.amountMinor, a.currency);
}

/**
 * Subtracts `b` from `a` (`a - b`) in integer minor units.
 *
 * @example
 * ```ts
 * subtractMoney(fromMinorUnits(500), fromMinorUnits(200)).amountMinor // 300
 * ```
 */
export function subtractMoney<C extends CurrencyCode>(a: Money<C>, b: Money<C>): Money<C> {
  assertSameCurrency(a, b);
  return fromMinorUnits(a.amountMinor - b.amountMinor, a.currency);
}

/**
 * Multiplies a `Money` value by a scalar factor using the configured rounding policy.
 *
 * @example
 * ```ts
 * multiplyMoney(fromMinorUnits(1000), 0.15).amountMinor // 150
 * ```
 */
export function multiplyMoney<C extends CurrencyCode>(
  money: Money<C>,
  factor: number,
  rounding: RoundingMode = 'half-even'
): Money<C> {
  return fromMinorUnits(roundToInteger(money.amountMinor * factor, rounding), money.currency);
}

/**
 * Returns the additive inverse (`-amountMinor`) of a `Money` value.
 */
export function negateMoney<C extends CurrencyCode>(money: Money<C>): Money<C> {
  return fromMinorUnits(-money.amountMinor, money.currency);
}

/**
 * Returns the absolute value (`Math.abs(amountMinor)`) of a `Money` value.
 */
export function absMoney<C extends CurrencyCode>(money: Money<C>): Money<C> {
  return fromMinorUnits(Math.abs(money.amountMinor), money.currency);
}

/**
 * Sums a list of `Money` values in integer minor units.
 *
 * @example
 * ```ts
 * sumMoney([fromMinorUnits(100), fromMinorUnits(250)], 'BRL').amountMinor // 350
 * ```
 */
export function sumMoney<C extends CurrencyCode = 'BRL'>(
  items: readonly Money<C>[],
  currency: C = 'BRL' as C
): Money<C> {
  let totalMinor = 0;
  for (const item of items) {
    if (item.currency !== currency) {
      throw new CurrencyMismatchError(currency, item.currency);
    }
    totalMinor += item.amountMinor;
  }
  return fromMinorUnits(totalMinor, currency);
}

/**
 * Sums major-unit numbers via integer minor units to prevent IEEE-754 floating-point drift.
 *
 * @example
 * ```ts
 * sumMajorAsMinor([0.1, 0.2]) // 0.3 (exact, never 0.30000000000000004)
 * ```
 */
export function sumMajorAsMinor(
  values: readonly number[],
  currency: CurrencyCode = 'BRL'
): number {
  let totalMinor = 0;
  for (const v of values) {
    totalMinor += majorToMinor(v, currency);
  }
  return minorToMajor(totalMinor, currency);
}

/**
 * Compares two `Money` values (`-1` if `a < b`, `0` if `a === b`, `1` if `a > b`).
 */
export function compareMoney<C extends CurrencyCode>(a: Money<C>, b: Money<C>): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

/**
 * Returns `true` if `money.amountMinor === 0`.
 */
export function isZeroMoney(money: Money<CurrencyCode>): boolean {
  return money.amountMinor === 0;
}

/**
 * Returns `true` if `a` and `b` have identical currency and `amountMinor`.
 */
export function equalsMoney(a: Money<CurrencyCode>, b: Money<CurrencyCode>): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

/**
 * Allocates a `Money` total across a list of non-negative weights/ratios using the
 * **Largest-Remainder Method** (Hamilton's method, §5.2).
 *
 * Guarantees that the sum of allocated slices equals `total.amountMinor` **exactly**
 * down to the last centavo.
 *
 * @example
 * ```ts
 * // Splitting R$ 1,00 (100 centavos) equally across 3 periods:
 * allocateMoney(fromMinorUnits(100, 'BRL'), [1, 1, 1])
 * // -> [{ amountMinor: 34, currency: 'BRL' }, { amountMinor: 33, currency: 'BRL' }, { amountMinor: 33, currency: 'BRL' }]
 * ```
 */
export function allocateMoney<C extends CurrencyCode = 'BRL'>(
  total: Money<C>,
  weights: readonly number[]
): Money<C>[] {
  if (weights.length === 0) {
    throw new RangeError('allocateMoney requires at least one weight');
  }
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0) {
      throw new RangeError(`allocateMoney weights must be finite and non-negative, got ${w}`);
    }
  }

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  if (totalWeight <= 0) {
    throw new RangeError('allocateMoney requires the sum of weights to be greater than zero');
  }

  const sign = total.amountMinor < 0 ? -1 : 1;
  const absTotalMinor = Math.abs(total.amountMinor);

  const floors: number[] = [];
  const remainders: { index: number; remainder: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i] ?? 0;
    const exactShare = (absTotalMinor * weight) / totalWeight;
    const floorShare = Math.floor(exactShare);
    const remainder = exactShare - floorShare;
    floors.push(floorShare);
    remainders.push({ index: i, remainder });
    sumFloors += floorShare;
  }

  let leftover = absTotalMinor - sumFloors;

  // Sort descending by remainder; tie-break by lower index for determinism
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-12) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });

  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    const target = remainders[i];
    if (target !== undefined && floors[target.index] !== undefined) {
      floors[target.index]! += 1;
      leftover -= 1;
    }
  }

  return floors.map((minor) => fromMinorUnits(sign * minor, total.currency));
}

/**
 * Parses a localized currency string (e.g. `"R$ 1.234,56"`, `"-1234.56"`, `"1.234,56"`)
 * or number into a `Money` value object.
 *
 * @example
 * ```ts
 * parseMoneyInput('R$ 1.234,56', 'BRL').amountMinor // 123456
 * ```
 */
export function parseMoneyInput<C extends CurrencyCode = 'BRL'>(
  raw: string | number,
  currency: C = 'BRL' as C
): Money<C> {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? fromMajorUnits(raw, currency) : fromMinorUnits(0, currency);
  }
  if (!raw || !raw.trim()) {
    return fromMinorUnits(0, currency);
  }

  const sanitized = raw.replace(/[R$€$\s]/g, '').trim();
  if (!sanitized) {
    return fromMinorUnits(0, currency);
  }

  const hasDot = sanitized.includes('.');
  const hasComma = sanitized.includes(',');

  let normalized: string;
  if (hasDot && hasComma) {
    const lastDot = sanitized.lastIndexOf('.');
    const lastComma = sanitized.lastIndexOf(',');
    normalized =
      lastComma > lastDot
        ? sanitized.replace(/\./g, '').replace(',', '.')
        : sanitized.replace(/,/g, '');
  } else if (hasComma) {
    normalized = sanitized.replace(',', '.');
  } else {
    normalized = sanitized;
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return fromMinorUnits(0, currency);
  }

  return fromMajorUnits(parsed, currency);
}

export interface FormatMoneyOptions {
  locale?: string;
  compact?: boolean;
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  accountingParentheses?: boolean;
}

/**
 * Formats a `Money` value object via `Intl.NumberFormat` (§5.8).
 *
 * @example
 * ```ts
 * formatMoney(fromMinorUnits(150000, 'BRL')) // "R$ 1.500,00"
 * ```
 */
export function formatMoney(
  money: Money<CurrencyCode>,
  options: FormatMoneyOptions = {}
): string {
  const {
    locale = 'pt-BR',
    compact = false,
    signDisplay = 'auto',
    accountingParentheses = false,
  } = options;

  const majorValue = toMajorUnits(money);

  if (accountingParentheses && money.amountMinor < 0) {
    const absFormatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
    }).format(Math.abs(majorValue));
    return `(${absFormatted})`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    signDisplay,
    ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
  }).format(majorValue);
}
