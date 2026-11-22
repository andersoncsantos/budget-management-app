import type { Month } from '../budgetData';

const MONTHS: readonly Month[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

export function monthFromISO(dateISO: string): Month {
  const monthIndex = parseInt(dateISO.slice(5, 7), 10) - 1;
  return MONTHS[monthIndex] ?? 'Jan';
}

/**
 * Normalizes a date string into the canonical ISO 8601 format (YYYY-MM-DD).
 * Accepts: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY.
 * Brazilian users typically use DD/MM/YYYY, so DD/MM/YYYY is assumed when the
 * input is a 3-segment numeric date (heuristic: if first segment > 12 it must
 * be a day; if second segment > 12 it must be a day in US format; otherwise
 * DD/MM/YYYY is the default since the application targets Brazilian users).
 */
export function normalizeDateToISO(input: string): string {
  if (!input) return input;

  const trimmed = input.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashOrDotMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slashOrDotMatch) {
    const [, first, second, rawYear] = slashOrDotMatch;
    if (!first || !second || !rawYear) {
      return trimmed;
    }
    const year = rawYear.length === 2
      ? (parseInt(rawYear, 10) >= 70 ? '19' : '20') + rawYear
      : rawYear;
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);

    let day: string;
    let month: string;
    if (firstNum > 12) {
      day = first.padStart(2, '0');
      month = second.padStart(2, '0');
    } else if (secondNum > 12) {
      month = first.padStart(2, '0');
      day = second.padStart(2, '0');
    } else {
      day = first.padStart(2, '0');
      month = second.padStart(2, '0');
    }

    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return trimmed;
    }

    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

export function parseAmount(input: string | number): number {
  if (typeof input === 'number') return input;
  if (!input) return NaN;

  const sanitized = String(input).replace(/[R$\s]/g, '');
  const hasDot = sanitized.includes('.');
  const hasComma = sanitized.includes(',');

  let normalized: string;
  if (hasDot && hasComma) {
    const lastDot = sanitized.lastIndexOf('.');
    const lastComma = sanitized.lastIndexOf(',');
    normalized = lastComma > lastDot
      ? sanitized.replace(/\./g, '').replace(',', '.')
      : sanitized.replace(/,/g, '');
  } else if (hasComma) {
    normalized = sanitized.replace(',', '.');
  } else {
    normalized = sanitized;
  }

  const value = parseFloat(normalized);
  return value;
}

export function isValidDescription(description: string): boolean {
  if (!description) return false;
  const trimmed = description.trim();
  return trimmed.length >= 3 && trimmed.length <= 255;
}
