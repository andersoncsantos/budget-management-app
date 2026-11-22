import { TrendingDown, TrendingUp } from 'lucide-react';
import type { TransactionType } from '../../types/api';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
  expenseLabel?: string;
  incomeLabel?: string;
  label?: string;
}

const EXPENSE_LABEL_DEFAULT = 'Despesa';
const INCOME_LABEL_DEFAULT = 'Receita';

export const TransactionTypeSelector = ({
  value,
  onChange,
  expenseLabel = EXPENSE_LABEL_DEFAULT,
  incomeLabel = INCOME_LABEL_DEFAULT,
  label = 'Tipo de Transação',
}: TransactionTypeSelectorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, next: TransactionType) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(next);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-text-secondary ml-1 block">{label}</span>
      <div
        role="radiogroup"
        aria-label="Tipo de transação"
        className="relative p-1 bg-bg-input rounded-2xl flex gap-1 transition-colors"
      >
        <div
          aria-hidden="true"
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-sm transition-all duration-200 ease-out ${
            value === 'EXPENSE' ? 'left-1 bg-error' : 'left-[calc(50%+0px)] bg-success'
          }`}
        />

        <button
          type="button"
          role="radio"
          aria-checked={value === 'EXPENSE'}
          onClick={() => onChange('EXPENSE')}
          onKeyDown={(e) => handleKeyDown(e, 'INCOME')}
          className={`relative z-10 flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-error/40 ${
            value === 'EXPENSE' ? 'text-text-inverse' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <TrendingDown className="w-5 h-5" aria-hidden="true" />
          {expenseLabel}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'INCOME'}
          onClick={() => onChange('INCOME')}
          onKeyDown={(e) => handleKeyDown(e, 'EXPENSE')}
          className={`relative z-10 flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-success/40 ${
            value === 'INCOME' ? 'text-text-inverse' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <TrendingUp className="w-5 h-5" aria-hidden="true" />
          {incomeLabel}
        </button>
      </div>
    </div>
  );
};
