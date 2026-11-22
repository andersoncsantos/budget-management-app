import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BudgetData, BudgetMetadata, BudgetEntry, Month } from '../budgetData';
import { LocalStorageAdapter } from '../services/LocalStorageAdapter';
import type { ImportReport, ImportErrorDetail, Transaction } from '../services/IBudgetService';
import { BudgetContext, type BudgetContextValue, type BudgetEntryInput } from './budgetContextValue';
import { useAuth } from './AuthContext';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useBatchCreateTransactions,
  useUserMetadata,
  useUpdateUserMetadata,
} from '../hooks/useApi';
import { getMonthFromDate } from '../services/apiHelpers';
import { apiClient } from '../services/ApiClient';
import type { TransactionResponse, TransactionRequest } from '../types/api';

// Local storage adapter for offline mode
const localStorageService = new LocalStorageAdapter();

// Convert API transaction response to frontend transaction format
function convertApiTransaction(apiTx: TransactionResponse): Transaction {
  const month = getMonthFromDate(apiTx.date);
  return {
    id: apiTx.id || '',
    valor: apiTx.type === 'EXPENSE' ? -Math.abs(apiTx.amount) : Math.abs(apiTx.amount),
    data: apiTx.date,
    categoria: apiTx.category,
    descricao: apiTx.description || undefined,
    banco: apiTx.bank || undefined,
    mes: month,
  };
}

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [useApi, setUseApi] = useState(() => !!isAuthenticated && !!user);

  // Update useApi when auth state changes
  useEffect(() => {
    setUseApi(!!isAuthenticated && !!user);
  }, [isAuthenticated, user]);

  // Local storage state (for offline mode)
  const [localData, setLocalData] = useState<BudgetData>(localStorageService.getBudgetData());
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(
    localStorageService.getTransactions()
  );

  // API data (for online mode)
  const {
    data: apiTransactionsResponse = [],
  } = useTransactions(user?.userId);

  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const batchCreateTransactionMutation = useBatchCreateTransactions();

  // API metadata hooks
  const { data: apiMetadata } = useUserMetadata(user?.userId);
  const updateUserMetadataMutation = useUpdateUserMetadata();

  // Convert API transactions to frontend format
  const apiTransactions: Transaction[] = useMemo(
    () => apiTransactionsResponse.map(convertApiTransaction),
    [apiTransactionsResponse]
  );

  const months: Month[] = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const refreshState = useCallback(() => {
    if (useApi) {
      // Data is refreshed via React Query
    } else {
      setLocalData(localStorageService.getBudgetData());
      setLocalTransactions(localStorageService.getTransactions());
    }
  }, [useApi]);

  const saveEntry = useCallback(
    (entry: BudgetEntryInput) => {
      const { category, categoryId, description, amount, date, banco } = entry;
      const month = new Date(date).toLocaleString('en-US', { month: 'short' }) as Month;

      if (useApi && user?.userId) {
        const isExpense = amount < 0;
        createTransactionMutation.mutate(
          {
            userId: user.userId,
            amount: Math.abs(amount),
            date: date,
            categoryId: categoryId,
            category: category,
            description: description || null,
            bank: banco || null,
            type: isExpense ? 'EXPENSE' : 'INCOME',
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['transactions', user.userId] });
            },
          }
        );
      } else {
        localStorageService.addTransaction({
          valor: amount,
          categoria: category,
          mes: month,
          data: date,
          descricao: description,
          ...(banco ? { banco } : {}),
        });
        refreshState();
      }
    },
    [useApi, user, createTransactionMutation, refreshState, queryClient]
  );

  const addTransactions = useCallback(
    async (ts: Omit<Transaction, 'id'>[]): Promise<ImportReport> => {
      if (!useApi || !user?.userId) {
        const report = localStorageService.addTransactions(ts);
        refreshState();
        return report;
      }

      // Build case-insensitive maps of existing category and bank names from
      // loaded transactions. These names are guaranteed to exist in the
      // backend DB, so lookups will find exactly one match.
      const categoryMap: Record<string, string> = {};
      const bankMap: Record<string, string> = {};
      for (const tx of apiTransactions) {
        const catKey = tx.categoria.toLowerCase();
        if (!categoryMap[catKey]) {
          categoryMap[catKey] = tx.categoria;
        }
        if (tx.banco) {
          const bankKey = tx.banco.toLowerCase();
          if (!bankMap[bankKey]) {
            bankMap[bankKey] = tx.banco;
          }
        }
      }

      // Build category ID map from API to send unique IDs instead of names
      const categoryIdMap: Record<string, string> = {};
      try {
        const existingCategories = await apiClient.getCategories(user.userId);
        for (const cat of existingCategories) {
          const key = cat.name.toLowerCase();
          if (!categoryMap[key]) {
            categoryMap[key] = cat.name;
          }
          if (!categoryIdMap[key]) {
            categoryIdMap[key] = cat.id;
          }
        }
      } catch {
        // Categories API unavailable — continue with names only
      }

      const mapRow = (t: Omit<Transaction, 'id'>, index: number) => ({
        amount: Math.abs(t.valor),
        date: t.data,
        category: categoryMap[t.categoria.toLowerCase()] || t.categoria,
        description: t.descricao || null,
        bank: t.banco ? (bankMap[t.banco.toLowerCase()] || t.banco) : null,
        type: (t.valor < 0 ? 'EXPENSE' : 'INCOME') as 'EXPENSE' | 'INCOME',
        lineNumber: index + 2,
      });

      const makeBody = (t: Omit<Transaction, 'id'>, i: number): TransactionRequest => {
        const category = mapRow(t, i).category;
        return {
          userId: user.userId,
          amount: Math.abs(t.valor),
          date: t.data,
          category,
          categoryId: categoryIdMap[category.toLowerCase()],
          description: t.descricao || null,
          bank: t.banco ? (bankMap[t.banco.toLowerCase()] || t.banco) : null,
          type: (t.valor < 0 ? 'EXPENSE' : 'INCOME') as 'EXPENSE' | 'INCOME',
        };
      };

      // Try batch import first (fast path)
      try {
        const batchRequest = {
          userId: user.userId,
          transactions: ts.map((t, index) => mapRow(t, index)),
        };
        const response = await batchCreateTransactionMutation.mutateAsync(batchRequest);

        if (response.failedRecords > 0 && response.errors?.length) {
          // Batch had partial failures — retry failed rows individually with categoryId
          const failedLines = new Set(
            response.errors.map(e => e.line).filter((l): l is number => l !== null)
          );
          let imported = response.importedRecords;
          let skipped = 0;
          const allErrors: ImportErrorDetail[] = response.errors
            .filter(e => e.line !== null)
            .map(e => ({ line: e.line ?? undefined, message: e.message }));

          for (let i = 0; i < ts.length; i++) {
            if (failedLines.has(i + 2)) {
              try {
                await apiClient.createTransaction(makeBody(ts[i], i));
                imported++;
              } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown error';
                allErrors.push({ line: i + 2, message });
                skipped++;
              }
            }
          }

          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          return { imported, skipped, errors: allErrors.length > 0 ? allErrors : undefined };
        }

        // All batch rows succeeded
        return {
          imported: response.importedRecords,
          skipped: response.failedRecords,
          ...(response.errors?.length ? {
            errors: response.errors.map(e => ({
              line: e.line ?? undefined,
              message: e.message,
            })),
          } : {}),
        };
      } catch {
        // Batch failed — fall back to individual createTransaction calls
      }

      // Slow path: create each transaction individually
      let imported = 0;
      let skipped = 0;
      const errors: ImportErrorDetail[] = [];
      for (let i = 0; i < ts.length; i++) {
        try {
          await apiClient.createTransaction(makeBody(ts[i], i));
          imported++;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          errors.push({ line: i + 2, message });
          skipped++;
        }
      }

      // Manually invalidate transaction queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      return { imported, skipped, errors: errors.length > 0 ? errors : undefined };
    },
    [useApi, user, apiTransactions, batchCreateTransactionMutation, refreshState, queryClient]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (useApi && user?.userId) {
        deleteTransactionMutation.mutate(
          id,
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['transactions', user.userId] });
            },
          }
        );
      } else {
        localStorageService.deleteTransaction(id);
        refreshState();
      }
    },
    [useApi, user, deleteTransactionMutation, refreshState, queryClient]
  );

  const updateMetadata = useCallback(
    (metadata: Partial<BudgetMetadata>) => {
      if (useApi && user?.userId) {
        if (metadata.realBalance !== undefined) {
          updateUserMetadataMutation.mutate({
            userId: user.userId,
            data: { realBalance: metadata.realBalance },
          });
        }
      } else {
        localStorageService.updateMetadata(metadata);
        refreshState();
      }
    },
    [useApi, user, updateUserMetadataMutation, refreshState]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
      if (useApi && user?.userId) {
        const existing = apiTransactions.find((t) => t.id === id);
        if (!existing) return;

        const isExpense = (updates.valor ?? existing.valor) < 0;
        updateTransactionMutation.mutate(
          {
            id,
            data: {
              userId: user.userId,
              amount: Math.abs(updates.valor ?? existing.valor),
              date: updates.data ?? existing.data,
              category: updates.categoria ?? existing.categoria,
              description: updates.descricao ?? existing.descricao ?? null,
              bank: updates.banco ?? existing.banco ?? null,
              type: isExpense ? 'EXPENSE' : 'INCOME',
            },
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['transactions', user.userId] });
            },
          }
        );
      } else {
        localStorageService.updateTransaction(id, updates);
        refreshState();
      }
    },
    [useApi, user, apiTransactions, updateTransactionMutation, refreshState, queryClient]
  );

  // Calculate totals for the current data source
  const calculateTotalForMonth = useCallback(
    (month: Month) => {
      if (useApi) {
        // Calculate from API transactions
        const monthTransactions = apiTransactions.filter((t) => {
          return t.mes === month;
        });

        const income = monthTransactions
          .filter((t) => t.valor > 0)
          .reduce((acc, t) => acc + t.valor, 0);
        const expenses = monthTransactions
          .filter((t) => t.valor < 0)
          .reduce((acc, t) => acc + Math.abs(t.valor), 0);
        const balance = income - expenses;

        return { income, expenses, balance };
      } else {
        const income = Object.values(localData.income).reduce(
          (acc, entry) => acc + entry.monthlyValues[month],
          0
        );
        // Exclude "Gastos Total" to prevent double-counting (same logic as AnalyticsSection)
        const expenses = Object.entries(localData.expenses)
          .filter(([name]) => name !== 'Gastos Total' && !name.toLowerCase().includes('total'))
          .reduce((acc, [, entry]) => acc + entry.monthlyValues[month], 0);
        const balance = localData.balance.monthlyValues[month];

        return { income, expenses, balance };
      }
    },
    [useApi, apiTransactions, localData]
  );

  const getCategoryDistribution = useCallback(() => {
    if (useApi) {
      // Calculate from API transactions
      const expensesByCategory: Record<string, number> = {};

      apiTransactions
        .filter((t) => t.valor < 0)
        .forEach((t) => {
          expensesByCategory[t.categoria] = (expensesByCategory[t.categoria] || 0) + Math.abs(t.valor);
        });

      const totalExpenses = Object.values(expensesByCategory).reduce((acc, v) => acc + v, 0);

      if (totalExpenses === 0) {
        return [];
      }

      return Object.entries(expensesByCategory)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      const totalExpenses = Math.abs(localData.expenses['Gastos Total']?.total || 0);
      if (totalExpenses === 0) {
        return [];
      }
      return Object.entries(localData.expenses)
        .filter(([name, entry]) => name !== 'Gastos Total' && Math.abs(entry.total) > 0)
        .map(([name, entry]) => ({
          name,
          value: Math.abs(entry.total),
          percentage: totalExpenses > 0 ? (Math.abs(entry.total) / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [useApi, apiTransactions, localData]);

  const getCategories = useCallback(() => {
    if (useApi) {
      // Get unique categories from API transactions
      const categories = new Set<string>();
      apiTransactions.forEach((t) => categories.add(t.categoria));
      return Array.from(categories).sort();
    } else {
      const incomeCategories = Object.keys(localData.income);
      const expenseCategories = Object.keys(localData.expenses).filter(
        (cat) => cat !== 'Gastos Total'
      );
      return Array.from(new Set([...incomeCategories, ...expenseCategories])).sort();
    }
  }, [useApi, apiTransactions, localData]);

  const transactions = useApi ? apiTransactions : localTransactions;

  // Calculate data from API transactions when in API mode
  const calculatedData: BudgetData = useMemo(() => {
    if (useApi) {
      // Calculate income, expenses, and balance from API transactions
      const income: Record<string, BudgetEntry> = {};
      const expenses: Record<string, BudgetEntry> = {};
      const balance: BudgetEntry = {
        monthlyValues: {
          Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0,
          Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0
        },
        total: 0
      };

      // Group transactions by category and month
      months.forEach(month => {
        const monthTxs = apiTransactions.filter(t => t.mes === month);
        
        // Calculate income by category
        monthTxs.filter(t => t.valor > 0).forEach(t => {
          if (!income[t.categoria]) {
            income[t.categoria] = {
              monthlyValues: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
              total: 0
            };
          }
          income[t.categoria].monthlyValues[month] += t.valor;
        });

        // Calculate expenses by category
        monthTxs.filter(t => t.valor < 0).forEach(t => {
          if (!expenses[t.categoria]) {
            expenses[t.categoria] = {
              monthlyValues: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
              total: 0
            };
          }
          expenses[t.categoria].monthlyValues[month] += t.valor;
        });
      });

      // Calculate totals for each income category
      Object.values(income).forEach(entry => {
        entry.total = months.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
      });

      // Calculate totals for each expense category
      Object.values(expenses).forEach(entry => {
        entry.total = months.reduce((acc, m) => acc + entry.monthlyValues[m], 0);
      });

      // Calculate Gastos Total
      const gastosTotal: BudgetEntry = {
        monthlyValues: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
        total: 0
      };
      months.forEach(month => {
        const monthExpenses = Object.values(expenses).reduce((acc, entry) => acc + entry.monthlyValues[month], 0);
        gastosTotal.monthlyValues[month] = monthExpenses;
      });
      gastosTotal.total = months.reduce((acc, m) => acc + gastosTotal.monthlyValues[m], 0);
      expenses['Gastos Total'] = gastosTotal;

      // Calculate balance per month
      months.forEach(month => {
        const incomeTotal = Object.values(income).reduce((acc, entry) => acc + entry.monthlyValues[month], 0);
        const expensesTotal = gastosTotal.monthlyValues[month];
        balance.monthlyValues[month] = incomeTotal + expensesTotal;
      });
      balance.total = months.reduce((acc, m) => acc + balance.monthlyValues[m], 0);

      const resolvedMetadata: BudgetMetadata = {
        ...localData.metadata,
        ...(apiMetadata ? {
          realBalance: apiMetadata.realBalance,
          updatedDate: apiMetadata.updatedDate || localData.metadata.updatedDate,
        } : {}),
      };

      return {
        metadata: resolvedMetadata,
        income,
        expenses,
        balance
      };
    }
    return localData;
  }, [useApi, apiTransactions, localData, months, apiMetadata]);

  const value = useMemo<BudgetContextValue>(
    () => ({
      data: calculatedData,
      transactions,
      months,
      useApi,
      saveEntry,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      updateMetadata,
      calculateTotalForMonth,
      getCategoryDistribution,
      getCategories,
    }),
    [
      calculatedData,
      transactions,
      months,
      useApi,
      saveEntry,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      updateMetadata,
      calculateTotalForMonth,
      getCategoryDistribution,
      getCategories,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};