import { useContext } from 'react';
import { BudgetContext } from './budgetContextValue';
import type { BudgetContextValue } from './budgetContextValue';

export const useBudget = (): BudgetContextValue => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};
