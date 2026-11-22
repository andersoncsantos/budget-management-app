import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export function useApiBudgetService() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading, error } = useTransactions(user?.userId);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  return {
    transactions,
    isLoading,
    error,
    userId: user?.userId,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}