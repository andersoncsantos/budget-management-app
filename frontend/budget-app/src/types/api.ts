// Backend DTO types mapping

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
}

export interface BudgetRequest {
  userId: string;
  category: string;
  limitAmount: number;
  period: string;
}

export interface BudgetResponse {
  id: string | null;
  userId: string;
  category: string;
  limitAmount: number;
  period: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME';

export interface CategoryRequest {
  name: string;
  userId: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface TransactionRequest {
  userId: string;
  amount: number;
  date: string; // ISO 8601 date string
  categoryId?: string;
  category: string;
  description: string | null;
  bank: string | null;
  type: TransactionType;
}

export interface TransactionResponse {
  id: string | null;
  userId: string;
  categoryId?: string | null;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  bank: string | null;
  type: TransactionType;
}

/**
 * Batch import types
 */
export interface TransactionImportItem {
  amount: number;
  date: string;
  category: string;
  description: string | null;
  bank: string | null;
  type: TransactionType;
  lineNumber?: number;
}

export interface TransactionBatchRequest {
  userId: string;
  transactions: TransactionImportItem[];
}

export interface TransactionImportError {
  line: number | null;
  message: string;
}

export interface TransactionBatchResponse {
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  errors: TransactionImportError[];
}

export interface CategoryBreakdown {
  category: string;
  totalAmount: number;
  percentage: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: CategoryBreakdown[];
}

export interface MetadataResponse {
  realBalance: number;
  updatedDate: string | null;
}

export interface MetadataUpdateRequest {
  realBalance: number;
}

export interface ApiError {
  message: string;
  status: number;
}