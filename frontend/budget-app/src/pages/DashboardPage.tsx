import { useState, useRef, useEffect } from 'react';
import { useBudget } from '../context/useBudget';
import { SummaryCard } from '../components/SummaryCard';
import { AnalyticsSection } from '../components/AnalyticsSection';
import { TrendingUp, TrendingDown, Wallet, Calendar, X, Pencil, PiggyBank } from 'lucide-react';
import { formatBRL } from '../utils/currency';

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
  const [isEditingRealBalance, setIsEditingRealBalance] = useState(false);
  const [realBalanceInput, setRealBalanceInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const totalIncome = Object.values(data.income).reduce((acc, e) => acc + e.total, 0);
  const totalExpenses = Math.abs(data.expenses['Gastos Total'].total);
  const netBalance = data.balance.total;

  const analyticsStyleExpenses = Math.abs(
    Object.entries(data.expenses)
      .filter(([name]) => name !== 'Gastos Total' && !name.toLowerCase().includes('total'))
      .reduce((acc, [, entry]) => acc + (entry.monthlyValues['Mar'] || 0), 0)
  );
  const gastosTotalMar = Math.abs(data.expenses['Gastos Total']?.monthlyValues['Mar'] || 0);
  const marDifference = analyticsStyleExpenses - gastosTotalMar;

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
    const value = parseFloat(realBalanceInput.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(value)) {
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
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Orçamento 2026</h1>
          <p className="text-text-muted flex items-center gap-2 text-sm">
            <Calendar size={16} />
            Atualizado em: {formatDate(data.metadata.updatedDate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 bg-bg-card p-4 rounded-2xl shadow-sm border border-border-default">
            <div className="text-right">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center justify-end gap-4">
                <PiggyBank size={20} />
                Saldo Real
              </p>
              {isEditingRealBalance ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-text-secondary">R$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={realBalanceInput}
                    onChange={(e) => setRealBalanceInput(e.target.value)}
                    onBlur={handleRealBalanceSave}
                    onKeyDown={handleRealBalanceKeyDown}
                    onFocus={(e) => e.target.select()}
                    className="w-36 text-xl font-bold text-text-primary bg-bg-input border-2 border-primary rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-focus-ring transition-all shadow-sm"
                    placeholder="0,00"
                    autoFocus
                  />
                  <button
                    onClick={handleRealBalanceSave}
                    className="p-1.5 rounded-lg bg-primary hover:bg-primary-hover text-text-inverse transition-colors"
                    title="Salvar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsEditingRealBalance(false)}
                    className="p-1.5 rounded-lg bg-bg-elevated hover:bg-border-hover text-text-secondary transition-colors"
                    title="Cancelar (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleRealBalanceClick}
                  className="flex items-center gap-2 cursor-pointer hover:bg-bg-card rounded-lg px-3 py-1.5 -ml-3 transition-all duration-200 group border-2 border-transparent hover:border-primary/30"
                  title="Clique para editar"
                >
                  <p className="text-xl font-bold text-text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.metadata.realBalance)}
                  </p>
                  <Pencil className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-200" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Receitas"
          value={totalIncome}
          icon={TrendingUp}
          color="success"
          description="Soma de todas as entradas do ano"
        />
        <SummaryCard
          title="Total Despesas"
          value={totalExpenses}
          icon={TrendingDown}
          color="danger"
          description="Soma de todas as saídas do ano"
        />
        <SummaryCard
          title="Saldo Líquido"
          value={netBalance}
          icon={Wallet}
          color="primary"
          description="Diferença entre receitas e despesas"
        />
      </div>

      {marDifference !== 0 && (
        <div className="bg-bg-error border border-error/30 rounded-lg p-4 text-sm">
          <h3 className="font-bold text-error mb-2">Data Inconsistency Detected</h3>
          <div className="space-y-1 text-error/80">
            <p><strong>Tendência Mensal (Mar):</strong> {formatBRL(analyticsStyleExpenses)}</p>
            <p><strong>Gastos Total (Mar):</strong> {formatBRL(gastosTotalMar)}</p>
            <p><strong>Difference:</strong> {formatBRL(marDifference)}</p>
            <p className="text-xs text-error/60 mt-2">
              The sum of individual expense categories doesn't match the pre-computed Gastos Total.
            </p>
          </div>
        </div>
      )}

      <AnalyticsSection />
    </div>
  );
};

export default DashboardPage;
