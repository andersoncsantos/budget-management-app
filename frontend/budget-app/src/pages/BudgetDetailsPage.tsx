import { useState } from 'react';
import { useBudget } from '../context/useBudget';
import { formatBRL } from '../utils/currency';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { CategoryBadge } from '../components/ui/category-badge';
import type { BudgetEntry, Month } from '../budgetData';

const formatValue = (val: number): string => {
  if (val === 0) return '—';
  return formatBRL(val);
};

const valueClass = (val: number): string => {
  if (val === 0) return 'text-text-disabled';
  return val > 0 ? 'text-success' : 'text-error';
};

const iconMap = {
  income: TrendingUp,
  expense: TrendingDown,
} as const;

type SectionVariant = keyof typeof iconMap;

const TableSection = ({ title, data, variant }: {
  title: string;
  data: Record<string, BudgetEntry>;
  variant: SectionVariant;
}) => {
  const { months } = useBudget();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<Month[]>(months);

  const toggleMonth = (month: Month) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => months.indexOf(a) - months.indexOf(b))
    );
  };

  const entries = Object.entries(data).filter(([name]) => name !== 'Gastos Total');

  return (
    <div className="mb-8 space-y-4">
      <SectionHeader
        title={title}
        icon={iconMap[variant]}
        variant={variant}
        expanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        subtitle={`${entries.length} categorias`}
      />

      <div className="flex flex-wrap gap-2 mb-4 md:hidden">
        {months.map(month => (
          <button
            key={month}
            onClick={() => toggleMonth(month)}
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
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-bg-surface border-b border-border-default">
                  <th className="sticky left-0 z-20 bg-bg-surface py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs border-r border-border-default whitespace-nowrap min-w-[180px]">Categoria</th>
                  {months.map(month => (
                    <th key={month} className="py-3 px-2 text-center font-semibold text-text-secondary uppercase tracking-wider text-xs whitespace-nowrap min-w-[80px]">
                      {month}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-bold text-text-primary uppercase tracking-wider text-xs whitespace-nowrap border-l border-border-default min-w-[100px] sticky right-0 z-20 bg-bg-surface">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {entries.map(([name, entry]) => (
                  <tr key={name} className="hover:bg-bg-elevated/40 transition-colors group" style={{ height: '52px' }}>
                    <td className="sticky left-0 z-10 bg-bg-card py-3 px-4 text-left font-medium text-text-secondary group-hover:text-primary transition-colors border-r border-border-subtle whitespace-nowrap align-middle min-w-[180px]">
                      <CategoryBadge categoria={name} />
                    </td>
                    {months.map(month => (
                      <td key={month} className={`py-3 px-2 text-right font-mono tabular-nums align-middle whitespace-nowrap text-xs ${valueClass(entry.monthlyValues[month])}`}>
                        {formatValue(entry.monthlyValues[month])}
                      </td>
                    ))}
                    <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums align-middle whitespace-nowrap text-xs border-l border-border-default bg-bg-surface/50 min-w-[100px] sticky right-0 z-10 bg-bg-card ${valueClass(entry.total)}`}>
                      {formatValue(entry.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {entries.length === 0 ? (
              <p className="text-text-muted text-center py-8">Nenhum dado disponível</p>
            ) : (
              entries.map(([name, entry]) => (
                <div key={name} className="bg-bg-card rounded-xl border border-border-default p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <CategoryBadge categoria={name} />
                    <span className={`font-mono font-bold text-sm ${valueClass(entry.total)}`}>
                      {formatValue(entry.total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {selectedMonths.slice(0, 4).map(month => (
                      <div key={month} className="text-center">
                        <div className="text-text-muted uppercase font-medium mb-1">{month}</div>
                        <div className={`font-mono ${valueClass(entry.monthlyValues[month])}`}>
                          {formatValue(entry.monthlyValues[month])}
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
    </div>
  );
};

const BalanceSection = () => {
  const { data, months } = useBudget();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-10 space-y-4">
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
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-bg-surface border-b border-border-default">
                  <th className="sticky left-0 z-20 bg-bg-surface py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs border-r border-border-default whitespace-nowrap min-w-[180px]">Métrica</th>
                  {months.map(m => (
                    <th key={m} className="py-3 px-2 text-center font-semibold text-text-secondary uppercase tracking-wider text-xs whitespace-nowrap min-w-[80px]">{m}</th>
                  ))}
                  <th className="py-3 px-4 text-right font-bold text-text-primary uppercase tracking-wider text-xs whitespace-nowrap border-l border-border-default min-w-[100px] sticky right-0 z-20 bg-bg-surface">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-primary-light/40" style={{ height: '52px' }}>
                  <td className="sticky left-0 z-10 bg-primary-light/40 py-3 px-4 text-left font-bold text-primary border-r border-border-subtle whitespace-nowrap align-middle min-w-[180px]">Saldo Final</td>
                  {months.map(m => {
                    const val = data.balance.monthlyValues[m];
                    return (
                      <td key={m} className={`py-3 px-2 text-right font-mono font-semibold tabular-nums align-middle whitespace-nowrap text-xs ${valueClass(val)}`}>
                        {formatValue(val)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums align-middle whitespace-nowrap text-xs border-l border-border-default bg-bg-surface/50 min-w-[100px] sticky right-0 z-10 bg-primary-light/40 ${valueClass(data.balance.total)}`}>
                    {formatValue(data.balance.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="md:hidden bg-bg-card rounded-xl border border-border-default p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">Saldo Final</h3>
              <span className={`font-mono font-bold text-lg ${valueClass(data.balance.total)}`}>
                {formatValue(data.balance.total)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {months.slice(0, 6).map(month => (
                <div key={month} className="text-center p-2 bg-bg-surface rounded-lg">
                  <div className="text-text-muted uppercase font-medium mb-1">{month}</div>
                  <div className={`font-mono font-semibold ${valueClass(data.balance.monthlyValues[month])}`}>
                    {formatValue(data.balance.monthlyValues[month])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const BudgetDetailsPage = () => {
  const { data } = useBudget();

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">Detalhes Financeiros</h1>
          <p className="text-text-secondary text-lg mt-2">Uma análise completa de todas as suas receitas e despesas do ano.</p>
        </div>
      </div>

      <TableSection title="Receitas" data={data.income} variant="income" />
      <TableSection title="Despesas" data={data.expenses} variant="expense" />
      <BalanceSection />
    </div>
  );
};

export default BudgetDetailsPage;
