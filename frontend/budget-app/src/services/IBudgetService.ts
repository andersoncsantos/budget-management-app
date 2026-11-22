import type { Month, BudgetData, BudgetMetadata } from '../budgetData';

export interface Transaction {
  id: string;           // UUID v4 gerado pelo adaptador
  valor: number;        // positivo, em BRL (ex.: 150.00)
  categoria: string;    // nome da categoria (ex.: "Alimentação")
  mes: Month;           // mês ao qual a transação pertence
  data: string;         // ISO 8601 date string (ex.: "2026-01-15")
  descricao?: string;   // texto livre, máx. 255 caracteres
  banco?: string;       // banco/fonte (ex.: "Itaú", "Nubank")
}

export interface ImportErrorDetail {
  line?: number;
  message: string;
}

export interface ImportReport {
  imported: number;
  skipped: number;
  errors?: ImportErrorDetail[];
}

export interface IBudgetService {
  getBudgetData(): BudgetData;
  getTransactions(): Transaction[];
  addTransaction(t: Omit<Transaction, 'id'>): Transaction;
  addTransactions(ts: Omit<Transaction, 'id'>[]): ImportReport;
  updateTransaction(id: string, t: Partial<Omit<Transaction, 'id'>>): Transaction;
  deleteTransaction(id: string): void;
  updateMetadata(m: Partial<BudgetMetadata>): BudgetMetadata;
}
