import type { Month, BudgetData } from '../budgetData';
import type { Transaction } from './IBudgetService';

// Convert backend TransactionResponse to frontend Transaction format
export function toFrontendTransaction(
  response: {
    id: string | null;
    amount: number;
    date: string;
    category: string;
    description: string | null;
    type: string;
  },
  mes: Month
): Transaction {
  return {
    id: response.id || crypto.randomUUID(),
    valor: response.type === 'EXPENSE' ? -Math.abs(response.amount) : Math.abs(response.amount),
    data: response.date,
    categoria: response.category,
    descricao: response.description || undefined,
    mes,
  };
}

// Convert frontend transaction to backend TransactionRequest
export function toBackendTransactionRequest(
  transaction: Omit<Transaction, 'id'>,
  userId: string
): {
  userId: string;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  type: 'EXPENSE' | 'INCOME';
} {
  const isExpense = transaction.valor < 0;
  return {
    userId,
    amount: Math.abs(transaction.valor),
    date: transaction.data,
    category: transaction.categoria,
    description: transaction.descricao || null,
    type: isExpense ? 'EXPENSE' : 'INCOME',
  };
}

// Mapping from English month abbreviations to Portuguese
const ENGLISH_TO_PORTUGUESE_MONTH: Record<string, Month> = {
  'Jan': 'Jan',
  'Feb': 'Fev',
  'Mar': 'Mar',
  'Apr': 'Abr',
  'May': 'Mai',
  'Jun': 'Jun',
  'Jul': 'Jul',
  'Aug': 'Ago',
  'Sep': 'Set',
  'Oct': 'Out',
  'Nov': 'Nov',
  'Dec': 'Dez',
};

// Calculate month from date string (timezone-safe, avoids toLocaleString pitfalls)
export function getMonthFromDate(dateStr: string): Month {
  // Prefer ISO string extraction to avoid timezone shifts from new Date()
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const monthIndex = parseInt(dateStr.slice(5, 7), 10) - 1;
    return ENGLISH_TO_PORTUGUESE_MONTH[
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex]
    ] || 'Jan';
  }
  // Fallback for non-ISO dates
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return 'Jan';
  }
  const englishMonth = date.toLocaleString('en-US', { month: 'short' });
  return ENGLISH_TO_PORTUGUESE_MONTH[englishMonth] || 'Jan';
}

// Calculate totals for budget data
export function calculateTotals(data: BudgetData) {
  const months: Month[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const totals = {
    income: {} as Record<Month, number>,
    expenses: {} as Record<Month, number>,
    balance: {} as Record<Month, number>,
  };

  for (const m of months) {
    const incomeTotal = Object.values(data.income).reduce(
      (acc, entry) => acc + entry.monthlyValues[m],
      0
    );
    const expensesTotal = Object.values(data.expenses).reduce(
      (acc, entry) => acc + entry.monthlyValues[m],
      0
    );

    totals.income[m] = incomeTotal;
    totals.expenses[m] = expensesTotal;
    totals.balance[m] = incomeTotal + expensesTotal;
  }

  return totals;
}

// Generate category distribution for charts
export function getCategoryDistribution(expenses: BudgetData['expenses']) {
  const totalExpenses = Math.abs(expenses['Gastos Total']?.total || 0);
  return Object.entries(expenses)
    .filter(([name]) => name !== 'Gastos Total')
    .map(([name, entry]) => ({
      name,
      value: Math.abs(entry.total),
      percentage: totalExpenses > 0 ? (Math.abs(entry.total) / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// Get all unique categories
export function getAllCategories(data: BudgetData): string[] {
  const incomeCategories = Object.keys(data.income);
  const expenseCategories = Object.keys(data.expenses).filter((cat) => cat !== 'Gastos Total');
  return Array.from(new Set([...incomeCategories, ...expenseCategories])).sort();
}