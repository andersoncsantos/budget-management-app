import { useState, type ReactNode } from 'react';
import { Table, BarChart3, AlertCircle } from 'lucide-react';
import { ChartSkeleton } from '../ui/Skeleton';

export interface ChartTableColumn<Row> {
  readonly key: string;
  readonly header: string;
  readonly align?: 'left' | 'right' | 'center';
  readonly renderCell: (row: Row) => ReactNode;
}

export interface ChartCardProps<Row> {
  readonly title: string;
  /** Explicit units and period (e.g. `"BRL (R$) · Jan–Dez 2026"`, §7.5). */
  readonly subtitle: string;
  readonly description?: string;
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly isEmpty?: boolean;
  readonly emptyMessage?: string;
  readonly emptyHint?: string;
  /** Data rows and columns for the accessible table alternative ("Ver como tabela", §7.2, §9). */
  readonly tableData: readonly Row[];
  readonly tableColumns: readonly ChartTableColumn<Row>[];
  readonly getRowKey: (row: Row, index: number) => string;
  readonly tableCaption?: string;
  readonly headerAction?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Shared accessible `<ChartCard>` wrapper (§7.2, §7.5, §9).
 *
 * Provides:
 * - Title, description, and mandatory unit + period subtitle.
 * - Loading skeleton, empty state, and error state with retry.
 * - Keyboard-accessible toggle (`"Ver como tabela"` / `"Ver gráfico"`) exposing a
 *   semantic `<table>` alternative so screen readers and keyboard users never rely on canvas/SVG tooltips alone.
 */
export function ChartCard<Row>({
  title,
  subtitle,
  description,
  isLoading = false,
  error = null,
  onRetry,
  isEmpty = false,
  emptyMessage = 'Nenhum dado encontrado para o período selecionado.',
  emptyHint = 'Adicione transações ou altere o filtro de período.',
  tableData,
  tableColumns,
  getRowKey,
  tableCaption,
  headerAction,
  children,
}: ChartCardProps<Row>) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  if (isLoading) {
    return <ChartSkeleton label={`Carregando ${title}`} />;
  }

  const alignClass = (align: ChartTableColumn<Row>['align'] = 'left') => {
    if (align === 'right') return 'text-right tabular-nums font-mono';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <section
      aria-label={title}
      className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-default flex flex-col gap-5 transition-shadow duration-200 hover:shadow-md"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">
            {title}
          </h3>
          <p className="text-xs font-medium text-text-muted">{subtitle}</p>
          {description && (
            <p className="text-xs text-text-secondary">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {headerAction}
          {!isEmpty && !error && (
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === 'chart' ? 'table' : 'chart'))}
              aria-pressed={viewMode === 'table'}
              aria-label={
                viewMode === 'chart'
                  ? `Ver ${title} como tabela de dados`
                  : `Ver ${title} como gráfico`
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border-default bg-bg-input text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors min-h-8"
            >
              {viewMode === 'chart' ? (
                <>
                  <Table className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ver como tabela</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ver gráfico</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="h-80 flex flex-col items-center justify-center gap-3 text-center p-6 rounded-xl bg-bg-error border border-error/30"
        >
          <AlertCircle className="w-8 h-8 text-error" aria-hidden="true" />
          <p className="text-sm font-semibold text-error">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-text-inverse hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : isEmpty ? (
        <div className="h-80 flex flex-col items-center justify-center text-text-muted text-center p-6 rounded-xl bg-bg-input/50 border border-dashed border-border-default">
          <p className="text-sm font-medium text-text-secondary">{emptyMessage}</p>
          {emptyHint && <p className="text-xs text-text-muted mt-1">{emptyHint}</p>}
        </div>
      ) : viewMode === 'table' ? (
        <div className="max-h-80 overflow-y-auto rounded-xl border border-border-default">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {tableCaption ?? `${title} — ${subtitle}`}
            </caption>
            <thead className="sticky top-0 bg-bg-elevated border-b border-border-default">
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2.5 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${alignClass(col.align)}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-card">
              {tableData.map((row, index) => (
                <tr key={getRowKey(row, index)} className="hover:bg-bg-elevated/40">
                  {tableColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 text-xs text-text-primary ${alignClass(col.align)}`}
                    >
                      {col.renderCell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-80 w-full">{children}</div>
      )}
    </section>
  );
}
