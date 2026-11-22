import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/ApiClient';
import type { TransactionRequest, BudgetRequest, CategoryRequest, TransactionBatchRequest, MetadataUpdateRequest } from '../types/api';

// Query keys
export const queryKeys = {
  transactions: (userId: string) => ['transactions', userId] as const,
  transaction: (id: string) => ['transaction', id] as const,
  budgets: (userId: string) => ['budgets', userId] as const,
  budget: (id: string) => ['budget', id] as const,
  categories: (userId: string) => ['categories', userId] as const,
  financialSummary: (userId: string) => ['financialSummary', userId] as const,
  metadata: (userId: string) => ['metadata', userId] as const,
};

// Transaction hooks
export function useTransactions(
  userId: string | undefined,
  filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }
) {
  return useQuery({
    queryKey: [...queryKeys.transactions(userId || ''), filters],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return apiClient.getTransactions(userId, filters);
    },
    enabled: !!userId,
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transaction(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Transaction ID is required');
      return apiClient.getTransaction(id);
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransactionRequest) => apiClient.createTransaction(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(response.userId) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionRequest }) =>
      apiClient.updateTransaction(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(response.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(response.id || '') });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useBatchCreateTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransactionBatchRequest) => apiClient.batchImportTransactions(data),
    onSuccess: () => {
      // Invalidate all transaction queries after batch import
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Category hooks
export function useCategories(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return apiClient.getCategories(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryRequest) => apiClient.createCategory(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(response.userId) });
    },
  });
}

// Budget hooks
export function useBudgets(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.budgets(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return apiClient.getBudgets(userId);
    },
    enabled: !!userId,
  });
}

export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.budget(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Budget ID is required');
      return apiClient.getBudget(id);
    },
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BudgetRequest) => apiClient.createBudget(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets(response.userId) });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetRequest }) =>
      apiClient.updateBudget(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets(response.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.budget(response.id || '') });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// Metadata hooks
export function useUserMetadata(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.metadata(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return apiClient.getUserMetadata(userId);
    },
    enabled: !!userId,
  });
}

export function useUpdateUserMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: MetadataUpdateRequest }) =>
      apiClient.updateUserMetadata(userId, data),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(queryKeys.metadata(variables.userId), response);
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata(variables.userId) });
    },
  });
}

// Report hooks
export function useFinancialSummary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.financialSummary(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return apiClient.getFinancialSummary(userId);
    },
    enabled: !!userId,
  });
}

// Re-export useApiBudgetService from the correct location
export { useApiBudgetService } from '../services/ApiBudgetService';