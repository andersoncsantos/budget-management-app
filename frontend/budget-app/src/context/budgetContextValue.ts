import { createContext } from 'react';
import type { BudgetData, BudgetMetadata, Month } from '../budgetData';
import type { ImportReport, Transaction } from '../services/IBudgetService';

export interface BudgetEntryInput {
  category: string;
  categoryId?: string;
  description: string;
  amount: number;
  date: string;
  banco?: string;
}

export interface BudgetContextValue {
  data: BudgetData;
  transactions: Transaction[];
  months: Month[];
  useApi: boolean;
  saveEntry: (entry: BudgetEntryInput) => void;
  addTransactions: (ts: Omit<Transaction, 'id'>[]) => Promise<ImportReport>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  updateMetadata: (metadata: Partial<BudgetMetadata>) => void;
  calculateTotalForMonth: (month: Month) => { income: number; expenses: number; balance: number };
  getCategoryDistribution: () => { name: string; value: number; percentage: number }[];
  getCategories: () => string[];
}

export const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);
