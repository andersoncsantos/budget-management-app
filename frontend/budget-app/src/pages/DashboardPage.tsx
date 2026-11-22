import { useState, useRef, useEffect } from 'react';
import { useBudget } from '../context/useBudget';
import { AnalyticsSection } from '../components/AnalyticsSection';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  X,
  Pencil,
  PiggyBank,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { parseBRL } from '../utils/currency';
import {
  calculateDashboardComparison,
  calculateKpiSummary,
} from '../features/budgets';
import { KpiCard } from '../shared/ui/KpiCard';
import { MoneyDisplay } from '../shared/ui/MoneyDisplay';
import { usePortalUrlState } from '../shared/hooks/usePortalUrlState';
import { usePrivacyMask } from '../shared/hooks/usePrivacyMask';

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(date)) return date;
  try {
    return new Date(date).toLocaleString('pt-BR');
  } catch {
    return date;
  }
};

const DashboardPage = () => {
  const { data, updateMetadata } = useBudget();
  const { period, activeMonths, periodLabel } = usePortalUrlState();
  const { isHidden, togglePrivacy } = usePrivacyMask();
  const [isEditingRealBalance, setIsEditingRealBalance] = useState(false);
  const [realBalanceInput, setRealBalanceInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { totalIncome, totalExpenses, netBalance } = calculateKpiSummary(data, activeMonths);
  const comparison = calculateDashboardComparison(data, period, activeMonths);

  useEffect(() => {
    if (isEditingRealBalance && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingRealBalance]);

  const handleRealBalanceClick = () => {
    setRealBalanceInput(data.metadata.realBalance.toString());
    setIsEditingRealBalance(true);
  };

  const handleRealBalanceSave = () => {
    const value = parseBRL(realBalanceInput);
    if (!Number.isNaN(value)) {
      updateMetadata({ realBalance: value });
    }
    setIsEditingRealBalance(false);
  };

  const handleRealBalanceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRealBalanceSave();
    } else if (e.key === 'Escape') {
      setIsEditingRealBalance(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Orçamento 2026
            </h1>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-light text-primary border border-primary/20">
              {periodLabel}
            </span>
          </div>
          <p className="text-text-muted flex items-center gap-2 text-sm">
            <Calendar size={16} aria-hidden="true" />
            Atualizado em: {formatDate(data.metadata.updatedDate)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-bg-card p-4 rounded-2xl shadow-sm border border-border-default">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <PiggyBank size={18} aria-hidden="true" />
                  Saldo Real
                </p>
                <button
                  type="button"
                  onClick={togglePrivacy}
                  aria-label={isHidden ? 'Mostrar Saldo Real' : 'Ocultar Saldo Real'}
                  title={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                >
                  {isHidden ? (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {isEditingRealBalance ? (
                <div className="flex items-center gap-2 mt-1">
                  <label htmlFor="real-balance-input" className="text-lg text-text-secondary">
                    R$
                  </label>
                  <input
                    id="real-balance-input"
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={realBalanceInput}
                    onChange={(e) => setRealBalanceInput(e.target.value)}
                    onBlur={handleRealBalanceSave}
                    onKeyDown={handleRealBalanceKeyDown}
                    onFocus={(e) => e.target.select()}
                    className="w-36 text-xl font-bold text-text-primary tabular-nums bg-bg-input border-2 border-primary rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-focus-ring transition-all shadow-sm"
                    placeholder="0,00"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleRealBalanceSave}
                    aria-label="Salvar Saldo Real"
                    className="p-1.5 rounded-lg bg-primary hover:bg-primary-hover text-text-inverse transition-colors"
                    title="Salvar"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingRealBalance(false)}
                    aria-label="Cancelar edição do Saldo Real"
                    className="p-1.5 rounded-lg bg-bg-elevated hover:bg-border-hover text-text-secondary transition-colors"
                    title="Cancelar (Esc)"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRealBalanceClick}
                  className="flex items-center justify-end gap-2 cursor-pointer hover:bg-bg-elevated/60 rounded-lg px-3 py-1.5 -mr-2 transition-all duration-150 group border-2 border-transparent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  title="Clique para editar"
                  aria-label="Editar Saldo Real"
                >
                  <span className="text-xl font-bold text-text-primary tabular-nums">
                    <MoneyDisplay value={data.metadata.realBalance} />
                  </span>
                  <Pencil
                    aria-hidden="true"
                    className="w-4 h-4 text-text-muted opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Total Receitas"
          value={totalIncome}
          icon={TrendingUp}
          tone="positive"
          description={periodLabel}
          tooltip="Soma de todas as receitas registradas nos meses do período selecionado, calculada em centavos."
          delta={comparison.incomeDelta}
        />
        <KpiCard
          title="Total Despesas"
          value={totalExpenses}
          icon={TrendingDown}
          tone="negative"
          description={periodLabel}
          tooltip="Soma de todas as categorias de despesa no período selecionado. Reduções de gasto são sinalizadas como favoráveis."
          delta={comparison.expensesDelta}
        />
        <KpiCard
          title="Saldo Líquido"
          value={netBalance}
          icon={Wallet}
          tone="primary"
          description={periodLabel}
          tooltip="Diferença exata entre Total Receitas e Total Despesas no período selecionado (Receitas − Despesas)."
          delta={comparison.netDelta}
          showPrivacyToggle
        />
      </div>

      <AnalyticsSection activeMonths={activeMonths} periodLabel={periodLabel} />
    </div>
  );
};

export default DashboardPage;
