import { useMemo, useState } from 'react';
import { useBudget } from '../context/useBudget';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpDown,
  Rows3,
  Rows4,
} from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { CategoryBadge } from '../components/ui/category-badge';
import type { BudgetEntry, Month } from '../budgetData';
import { majorToMinor, minorToMajor } from '../shared/lib/money';
import { isSyntheticTotalCategory } from '../features/budgets';
import { MoneyDisplay } from '../shared/ui/MoneyDisplay';
import { usePortalUrlState } from '../shared/hooks/usePortalUrlState';

type TableDensity = 'comfortable' | 'compact';
type SortField = 'category' | 'total';
type SortDirection = 'asc' | 'desc';

const DENSITY_STORAGE_KEY = 'budget-app:table-density';

const valueClass = (val: number): string => {
  if (val === 0) return 'text-text-disabled';
  return val > 0 ? 'text-positive' : 'text-negative';
};

const renderCellAmount = (val: number) => {
  if (val === 0) return '—';
  return <MoneyDisplay value={val} signDisplay="exceptZero" />;
};

const iconMap = {
  income: TrendingUp,
  expense: TrendingDown,
} as const;

type SectionVariant = keyof typeof iconMap;

function sumEntryForMonths(entry: BudgetEntry, months: readonly Month[]): number {
  let sumMinor = 0;
  for (const m of months) {
    sumMinor += majorToMinor(entry.monthlyValues[m] ?? 0);
  }
  return minorToMajor(sumMinor);
}

const TableSection = ({
  title,
  data,
  variant,
  activeMonths,
  density,
  searchQuery,
}: {
  title: string;
  data: Record<string, BudgetEntry>;
  variant: SectionVariant;
  activeMonths: readonly Month[];
  density: TableDensity;
  searchQuery: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<Month[]>([...activeMonths]);
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'total' ? 'desc' : 'asc');
    }
  };

  const toggleMonth = (month: Month) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort(
            (a, b) => activeMonths.indexOf(a) - activeMonths.indexOf(b)
          )
    );
  };

  const rows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = Object.entries(data)
      .filter(([name]) => !isSyntheticTotalCategory(name))
      .filter(([name]) =>
        normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true
      )
      .map(([name, entry]) => ({
        name,
        entry,
        periodTotal: sumEntryForMonths(entry, activeMonths),
      }));

    return filtered.sort((a, b) => {
      if (sortField === 'category') {
        const cmp = a.name.localeCompare(b.name, 'pt-BR');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const diff = Math.abs(a.periodTotal) - Math.abs(b.periodTotal);
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [data, activeMonths, searchQuery, sortField, sortDirection]);

  const columnTotals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let grandTotalMinor = 0;

    for (const m of activeMonths) {
      let monthMinor = 0;
      for (const row of rows) {
        monthMinor += majorToMinor(row.entry.monthlyValues[m] ?? 0);
      }
      byMonth[m] = minorToMajor(monthMinor);
      grandTotalMinor += monthMinor;
    }

    return {
      byMonth,
      grandTotal: minorToMajor(grandTotalMinor),
    };
  }, [rows, activeMonths]);

  const cellPadding = density === 'compact' ? 'py-2 px-2' : 'py-3 px-2';
  const firstColPadding = density === 'compact' ? 'py-2 px-4' : 'py-3 px-4';

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <section aria-label={title} className="mb-8 space-y-4">
      <SectionHeader
        title={title}
        icon={iconMap[variant]}
        variant={variant}
        expanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        subtitle={`${rows.length} categorias`}
      />

      <div className="flex flex-wrap gap-2 mb-4 md:hidden">
        {activeMonths.map((month) => (
          <button
            key={month}
            type="button"
            onClick={() => toggleMonth(month)}
            aria-pressed={selectedMonths.includes(month)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              selectedMonths.includes(month)
                ? 'bg-primary-light text-primary border border-primary/30'
                : 'bg-bg-input text-text-muted border border-border-default'
            }`}
          >
            {month}
          </button>
        ))}
      </div>

      {isExpanded && (
        <>
          <div className="hidden md:block overflow-x-auto bg-bg-card rounded-2xl border border-border-default shadow-sm">
            <table className="w-full border-collapse text-sm min-w-[640px]">
              <caption className="sr-only">
                Tabela de {title} por categoria e mês
              </caption>
              <thead className="sticky top-0 z-10">
                <tr className="bg-bg-elevated border-b border-border-default">
                  <th
                    scope="col"
                    aria-sort={getAriaSort('category')}
                    className={`sticky left-0 z-20 bg-bg-elevated ${firstColPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs border-r border-border-default whitespace-nowrap min-w-[180px]`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('category')}
                      className="inline-flex items-center gap-1.5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                    >
                      <span>Categoria</span>
                      <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </th>
                  {activeMonths.map((month) => (
                    <th
                      key={month}
                      scope="col"
                      className={`${cellPadding} text-right font-semibold text-text-secondary uppercase tracking-wider text-xs whitespace-nowrap min-w-[88px]`}
                    >
                      {month}
                    </th>
                  ))}
                  <th
                    scope="col"
                    aria-sort={getAriaSort('total')}
                    className={`${firstColPadding} text-right font-bold text-text-primary uppercase tracking-wider text-xs whitespace-nowrap border-l border-border-default min-w-[110px] sticky right-0 z-20 bg-bg-elevated`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('total')}
                      className="inline-flex items-center justify-end gap-1.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded ml-auto"
                    >
                      <span>Total</span>
                      <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map(({ name, entry, periodTotal }) => (
                  <tr
                    key={name}
                    className="hover:bg-bg-elevated/40 transition-colors group"
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 bg-bg-card ${firstColPadding} text-left font-medium text-text-secondary group-hover:text-primary transition-colors border-r border-border-subtle whitespace-nowrap align-middle min-w-[180px]`}
                    >
                      <CategoryBadge categoria={name} />
                    </th>
                    {activeMonths.map((month) => {
                      const val = entry.monthlyValues[month];
                      return (
                        <td
                          key={month}
                          className={`${cellPadding} text-right font-mono tabular-nums align-middle whitespace-nowrap text-xs ${valueClass(val)}`}
                        >
                          {renderCellAmount(val)}
                        </td>
                      );
                    })}
                    <td
                      className={`${firstColPadding} text-right font-mono font-bold tabular-nums align-middle whitespace-nowrap text-xs border-l border-border-default min-w-[110px] sticky right-0 z-10 bg-bg-card ${valueClass(periodTotal)}`}
                    >
                      {renderCellAmount(periodTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-bg-elevated/70 border-t-2 border-border-default font-bold">
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 bg-bg-elevated ${firstColPadding} text-left text-xs uppercase tracking-wider text-text-primary border-r border-border-default`}
                    >
                      Subtotal ({title})
                    </th>
                    {activeMonths.map((month) => {
                      const colVal = columnTotals.byMonth[month] ?? 0;
                      return (
                        <td
                          key={month}
                          className={`${cellPadding} text-right font-mono tabular-nums text-xs ${valueClass(colVal)}`}
                        >
                          {renderCellAmount(colVal)}
                        </td>
                      );
                    })}
                    <td
                      className={`${firstColPadding} text-right font-mono tabular-nums text-xs border-l border-border-default sticky right-0 z-10 bg-bg-elevated ${valueClass(columnTotals.grandTotal)}`}
                    >
                      {renderCellAmount(columnTotals.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {rows.length === 0 ? (
              <p className="text-text-muted text-center py-8">Nenhum dado disponível</p>
            ) : (
              rows.map(({ name, entry, periodTotal }) => (
                <div
                  key={name}
                  className="bg-bg-card rounded-xl border border-border-default p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <CategoryBadge categoria={name} />
                    <span className={`font-mono font-bold text-sm ${valueClass(periodTotal)}`}>
                      {renderCellAmount(periodTotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {selectedMonths.slice(0, 4).map((month) => (
                      <div key={month} className="text-center">
                        <div className="text-text-muted uppercase font-medium mb-1">
                          {month}
                        </div>
                        <div className={`font-mono ${valueClass(entry.monthlyValues[month])}`}>
                          {renderCellAmount(entry.monthlyValues[month])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
};

const BalanceSection = ({
  activeMonths,
  density,
}: {
  activeMonths: readonly Month[];
  density: TableDensity;
}) => {
  const { data } = useBudget();
  const [isExpanded, setIsExpanded] = useState(true);

  const periodBalanceTotal = useMemo(
    () => sumEntryForMonths(data.balance, activeMonths),
    [data.balance, activeMonths]
  );

  const cellPadding = density === 'compact' ? 'py-2 px-2' : 'py-3 px-2';
  const firstColPadding = density === 'compact' ? 'py-2 px-4' : 'py-3 px-4';

  return (
    <section aria-label="Saldo Líquido" className="mb-10 space-y-4">
      <SectionHeader
        title="Saldo Líquido"
        icon={Wallet}
        variant="balance"
        expanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <>
          <div className="hidden md:block overflow-x-auto bg-bg-card rounded-2xl border border-border-default shadow-sm">
            <table className="w-full border-collapse text-sm min-w-[640px]">
              <caption className="sr-only">
                Tabela de Saldo Líquido mensal e acumulado no período
              </caption>
              <thead className="sticky top-0 z-10">
                <tr className="bg-bg-elevated border-b border-border-default">
                  <th
                    scope="col"
                    className={`sticky left-0 z-20 bg-bg-elevated ${firstColPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs border-r border-border-default whitespace-nowrap min-w-[180px]`}
                  >
                    Métrica
                  </th>
                  {activeMonths.map((m) => (
                    <th
                      key={m}
                      scope="col"
                      className={`${cellPadding} text-right font-semibold text-text-secondary uppercase tracking-wider text-xs whitespace-nowrap min-w-[88px]`}
                    >
                      {m}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className={`${firstColPadding} text-right font-bold text-text-primary uppercase tracking-wider text-xs whitespace-nowrap border-l border-border-default min-w-[110px] sticky right-0 z-20 bg-bg-elevated`}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-primary-light/40">
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 bg-primary-light/40 ${firstColPadding} text-left font-bold text-primary border-r border-border-subtle whitespace-nowrap align-middle min-w-[180px]`}
                  >
                    Saldo Final
                  </th>
                  {activeMonths.map((m) => {
                    const val = data.balance.monthlyValues[m];
                    return (
                      <td
                        key={m}
                        className={`${cellPadding} text-right font-mono font-semibold tabular-nums align-middle whitespace-nowrap text-xs ${valueClass(val)}`}
                      >
                        {renderCellAmount(val)}
                      </td>
                    );
                  })}
                  <td
                    className={`${firstColPadding} text-right font-mono font-bold tabular-nums align-middle whitespace-nowrap text-xs border-l border-border-default min-w-[110px] sticky right-0 z-10 bg-primary-light/40 ${valueClass(periodBalanceTotal)}`}
                  >
                    {renderCellAmount(periodBalanceTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="md:hidden bg-bg-card rounded-xl border border-border-default p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">Saldo Final</h3>
              <span className={`font-mono font-bold text-lg ${valueClass(periodBalanceTotal)}`}>
                {renderCellAmount(periodBalanceTotal)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {activeMonths.slice(0, 6).map((month) => (
                <div key={month} className="text-center p-2 bg-bg-elevated rounded-lg">
                  <div className="text-text-muted uppercase font-medium mb-1">
                    {month}
                  </div>
                  <div
                    className={`font-mono font-semibold ${valueClass(data.balance.monthlyValues[month])}`}
                  >
                    {renderCellAmount(data.balance.monthlyValues[month])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const BudgetDetailsPage = () => {
  const { data } = useBudget();
  const { activeMonths, periodLabel, globalQuery } = usePortalUrlState();
  const [density, setDensity] = useState<TableDensity>(() => {
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === 'compact' ? 'compact' : 'comfortable';
  });

  const handleDensityChange = (next: TableDensity) => {
    setDensity(next);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Detalhes Financeiros
            </h1>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-light text-primary border border-primary/20">
              {periodLabel}
            </span>
          </div>
          <p className="text-text-secondary text-base sm:text-lg mt-2">
            Uma análise completa de todas as suas receitas e despesas ({periodLabel}).
          </p>
        </div>

        {/* Table Density Toggle (§6.2) */}
        <div
          role="group"
          aria-label="Densidade da tabela"
          className="inline-flex items-center bg-bg-card border border-border-default rounded-xl p-1 shadow-sm self-start"
        >
          <button
            type="button"
            onClick={() => handleDensityChange('comfortable')}
            aria-pressed={density === 'comfortable'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              density === 'comfortable'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Rows3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Confortável</span>
          </button>
          <button
            type="button"
            onClick={() => handleDensityChange('compact')}
            aria-pressed={density === 'compact'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              density === 'compact'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Rows4 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compacta</span>
          </button>
        </div>
      </div>

      <TableSection
        title="Receitas"
        data={data.income}
        variant="income"
        activeMonths={activeMonths}
        density={density}
        searchQuery={globalQuery}
      />
      <TableSection
        title="Despesas"
        data={data.expenses}
        variant="expense"
        activeMonths={activeMonths}
        density={density}
        searchQuery={globalQuery}
      />
      <BalanceSection activeMonths={activeMonths} density={density} />
    </div>
  );
};

export default BudgetDetailsPage;
