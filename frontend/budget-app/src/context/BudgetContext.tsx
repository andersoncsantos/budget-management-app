import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BudgetData, BudgetMetadata, Month } from '../budgetData';
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
import {
  ALL_MONTHS,
  calculateBudgetMatrixFromTransactions,
  calculateCategoryDistribution,
  calculateMonthlySummary,
  reconcileBudgetData,
} from '../features/budgets';

// Local storage adapter for offline mode
const localStorageService = new LocalStorageAdapter();

const MONTHS: Month[] = [...ALL_MONTHS];

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
  const useApi = !!isAuthenticated && !!user;

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

  const months = MONTHS;

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
            const row = ts[i];
            if (row && failedLines.has(i + 2)) {
              try {
                await apiClient.createTransaction(makeBody(row, i));
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
        const row = ts[i];
        if (!row) continue;
        try {
          await apiClient.createTransaction(makeBody(row, i));
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

  const transactions = useApi ? apiTransactions : localTransactions;

  // Calculate data from API transactions when in API mode using integer minor-unit domain functions
  const calculatedData: BudgetData = useMemo(() => {
    if (useApi) {
      const resolvedMetadata: BudgetMetadata = {
        ...localData.metadata,
        ...(apiMetadata ? {
          realBalance: apiMetadata.realBalance,
          updatedDate: apiMetadata.updatedDate || localData.metadata.updatedDate,
        } : {}),
      };

      return calculateBudgetMatrixFromTransactions(apiTransactions, resolvedMetadata);
    }
    return reconcileBudgetData(localData);
  }, [useApi, apiTransactions, localData, apiMetadata]);

  // Calculate totals for the current data source from the single reconciled matrix
  const calculateTotalForMonth = useCallback(
    (month: Month) => calculateMonthlySummary(calculatedData, month),
    [calculatedData]
  );

  const getCategoryDistribution = useCallback(
    () => calculateCategoryDistribution(calculatedData),
    [calculatedData]
  );

  const getCategories = useCallback(() => {
    if (useApi) {
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