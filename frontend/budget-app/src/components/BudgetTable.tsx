import React from 'react';
import { useBudget } from '../context/useBudget';
import { formatBRL } from '../utils/currency';
import { CategoryBadge } from './ui/category-badge';
import type { BudgetEntry } from '../budgetData';

export const BudgetTable: React.FC = () => {
  const { data, months } = useBudget();

  const renderRow = (name: string, entry: BudgetEntry, isBalance = false) => {
    return (
      <tr className={`border-b border-border ${isBalance ? 'bg-primary/5 font-bold' : 'hover:bg-primary/5'} transition-colors duration-200`}>
        <td className="py-3 px-4 text-left font-medium text-text-main w-64">
          <CategoryBadge categoria={name} />
        </td>
        {months.map(month => (
          <td key={month} className="py-3 px-4 text-right text-sm text-text-muted font-mono tabular-nums">
            {formatBRL(entry.monthlyValues[month])}
          </td>
        ))}
        <td className="py-3 px-4 text-right font-semibold text-text-main font-mono tabular-nums">
          {formatBRL(entry.total)}
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto bg-bg-surface rounded-lg shadow-sm border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-bg-main border-b border-border">
            <th className="py-3 px-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Categoria</th>
            {months.map(month => (
              <th key={month} className="py-3 px-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">
                {month}
              </th>
            ))}
            <th className="py-3 px-4 text-right text-xs font-bold text-text-main uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-success/10">
            <td colSpan={14} className="py-2 px-4 text-[10px] font-bold text-success uppercase tracking-widest">Receitas</td>
          </tr>
          {Object.entries(data.income).map(([name, entry]) => renderRow(name, entry))}

          <tr className="bg-danger/10">
            <td colSpan={14} className="py-2 px-4 text-[10px] font-bold text-danger uppercase tracking-widest">Despesas</td>
          </tr>
          {Object.entries(data.expenses).map(([name, entry]) => renderRow(name, entry))}

          <tr className="bg-primary/10">
            <td colSpan={14} className="py-2 px-4 text-[10px] font-bold text-primary uppercase tracking-widest">Saldo Final</td>
          </tr>
          {renderRow('Saldo', data.balance, true)}
        </tbody>
      </table>
    </div>
  );
};
