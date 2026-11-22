import {
  type CurrencyCode,
  type Money,
  formatMoney,
  fromMajorUnits,
} from '../lib/money';
import { usePrivacyMask } from '../hooks/usePrivacyMask';

export interface MoneyDisplayProps {
  /** Either a `Money` value object or a major-unit number (e.g., `1500.50`). */
  readonly value: Money<CurrencyCode> | number;
  readonly currency?: CurrencyCode;
  readonly locale?: string;
  /** Compact notation (e.g. `R$ 62 mil`). Full value is always exposed in `title` and `aria-label` (§5.8). */
  readonly compact?: boolean;
  readonly accountingParentheses?: boolean;
  readonly signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  /** Whether to respect the global privacy mask toggle (`true` by default). */
  readonly maskable?: boolean;
  readonly className?: string;
}

const CURRENCY_SYMBOL: Readonly<Record<CurrencyCode, string>> = {
  BRL: 'R$',
  USD: 'US$',
  EUR: '€',
};

/**
 * Accessible monetary value display component (§5.8, §6.1, §6.2).
 *
 * - Enforces `tabular-nums` alignment.
 * - Always exposes the full precision formatted value via `title` and `aria-label` when `compact` is enabled.
 * - Supports user-persisted privacy masking (`R$ •••••`).
 */
export function MoneyDisplay({
  value,
  currency = 'BRL',
  locale = 'pt-BR',
  compact = false,
  accountingParentheses = false,
  signDisplay = 'auto',
  maskable = true,
  className = '',
}: MoneyDisplayProps) {
  const { isHidden } = usePrivacyMask();

  const moneyObj: Money<CurrencyCode> =
    typeof value === 'number' ? fromMajorUnits(value, currency) : value;

  if (maskable && isHidden) {
    const symbol = CURRENCY_SYMBOL[moneyObj.currency] ?? moneyObj.currency;
    return (
      <span
        className={`tabular-nums select-none ${className}`.trim()}
        aria-label="Valor oculto por privacidade"
        title="Valor oculto por privacidade"
      >
        {symbol} •••••
      </span>
    );
  }

  const fullFormatted = formatMoney(moneyObj, {
    locale,
    compact: false,
    signDisplay,
    accountingParentheses,
  });

  const displayFormatted = compact
    ? formatMoney(moneyObj, {
        locale,
        compact: true,
        signDisplay,
        accountingParentheses,
      })
    : fullFormatted;

  return (
    <span
      className={`tabular-nums ${className}`.trim()}
      title={compact ? fullFormatted : undefined}
      aria-label={compact ? fullFormatted : undefined}
    >
      {displayFormatted}
    </span>
  );
}
