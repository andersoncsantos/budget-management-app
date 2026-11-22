import { useState, useId } from 'react';
import { HelpCircle, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import type { CurrencyCode, Money } from '../lib/money';
import { MoneyDisplay } from './MoneyDisplay';
import { CardSkeleton } from './Skeleton';
import { usePrivacyMask } from '../hooks/usePrivacyMask';

export type KpiTone = 'primary' | 'positive' | 'negative' | 'warning' | 'neutral';

export type KpiDeltaDirection = 'up' | 'down' | 'neutral';

export interface KpiComparisonDelta {
  /** Direction arrow (`'up'` -> ▲, `'down'` -> ▼, `'neutral'` -> —). */
  readonly direction: KpiDeltaDirection;
  /** Semantic tone so meaning is never conveyed by direction alone (e.g. expense decrease is positive). */
  readonly tone: 'positive' | 'negative' | 'neutral';
  /** Human-readable text with value and comparison period (e.g. `"+14,0% vs. mês anterior"`). */
  readonly label: string;
}

export interface KpiCardProps {
  readonly title: string;
  readonly value: Money<CurrencyCode> | number;
  readonly currency?: CurrencyCode;
  readonly icon: LucideIcon;
  readonly tone?: KpiTone;
  readonly description?: string;
  /** Detailed formula/explanation shown when user activates or hovers the info button (§6.1). */
  readonly tooltip?: string;
  readonly delta?: KpiComparisonDelta;
  readonly showPrivacyToggle?: boolean;
  readonly isLoading?: boolean;
}

const TONE_ICON_STYLES: Readonly<Record<KpiTone, string>> = {
  primary: 'text-primary bg-primary-light',
  positive: 'text-positive bg-positive-light',
  negative: 'text-negative bg-negative-light',
  warning: 'text-warning bg-warning-light',
  neutral: 'text-text-secondary bg-bg-elevated',
};

const DELTA_TONE_STYLES: Readonly<
  Record<KpiComparisonDelta['tone'], { badge: string; srPrefix: string }>
> = {
  positive: {
    badge: 'text-positive bg-positive-light border-positive/30',
    srPrefix: 'Variação favorável:',
  },
  negative: {
    badge: 'text-negative bg-negative-light border-negative/30',
    srPrefix: 'Variação desfavorável:',
  },
  neutral: {
    badge: 'text-text-secondary bg-bg-elevated border-border-default',
    srPrefix: 'Estável:',
  },
};

const DIRECTION_SYMBOL: Readonly<Record<KpiDeltaDirection, string>> = {
  up: '▲',
  down: '▼',
  neutral: '—',
};

/**
 * Modular KPI Card component (§6.1, §6.2, §9).
 *
 * - Displays primary value in `tabular-nums` via `<MoneyDisplay>`.
 * - Includes accessible info tooltip explaining what the metric means and how it is calculated.
 * - Renders comparison delta with direction symbol (`▲`/`▼`/`—`), semantic label, and screen-reader prefix (never color alone).
 */
export function KpiCard({
  title,
  value,
  currency = 'BRL',
  icon: Icon,
  tone = 'primary',
  description,
  tooltip,
  delta,
  showPrivacyToggle = false,
  isLoading = false,
}: KpiCardProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipId = useId();
  const { isHidden, togglePrivacy } = usePrivacyMask();

  if (isLoading) {
    return <CardSkeleton label={`Carregando ${title}`} />;
  }

  return (
    <article
      aria-label={title}
      className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-default flex flex-col justify-between gap-3 transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2.5 rounded-xl ${TONE_ICON_STYLES[tone]}`}>
          <Icon className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
        </div>

        <div className="flex items-center gap-1.5">
          {description && (
            <span className="text-xs font-medium text-text-muted">
              {description}
            </span>
          )}

          {showPrivacyToggle && (
            <button
              type="button"
              onClick={togglePrivacy}
              aria-label={isHidden ? 'Mostrar valores monetários' : 'Ocultar valores monetários'}
              title={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
              className="min-w-7 min-h-7 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
            >
              {isHidden ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}

          {tooltip && (
            <div className="relative">
              <button
                type="button"
                aria-label={`Informações sobre ${title}`}
                aria-expanded={isTooltipOpen}
                aria-describedby={isTooltipOpen ? tooltipId : undefined}
                onClick={() => setIsTooltipOpen((prev) => !prev)}
                onBlur={() => setIsTooltipOpen(false)}
                className="min-w-7 min-h-7 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </button>
              {isTooltipOpen && (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className="absolute right-0 top-9 z-30 w-64 p-3 rounded-xl bg-bg-tooltip text-text-inverse text-xs shadow-lg border border-border-default leading-relaxed"
                >
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          {title}
        </h3>
        <div className="text-2xl font-bold text-text-primary tabular-nums tracking-tight">
          <MoneyDisplay value={value} currency={currency} />
        </div>

        {delta && (
          <div className="pt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${DELTA_TONE_STYLES[delta.tone].badge}`}
            >
              <span aria-hidden="true">{DIRECTION_SYMBOL[delta.direction]}</span>
              <span className="sr-only">{DELTA_TONE_STYLES[delta.tone].srPrefix} </span>
              <span>{delta.label}</span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
