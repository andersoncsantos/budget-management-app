import type { Month, BudgetData, BudgetMetadata, BudgetEntry } from '../budgetData';
import { budgetData } from '../budgetData';
import type { IBudgetService, Transaction, ImportReport } from './IBudgetService';
import { majorToMinor, minorToMajor } from '../shared/lib/money';

const MONTHS: Month[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type InMemoryState = BudgetData & { transactions: Transaction[] };

export class InMemoryAdapter implements IBudgetService {
  private state: InMemoryState;

  constructor(initialData?: BudgetData) {
    this.state = {
      ...(initialData ?? budgetData),
      transactions: [],
    };
  }

  private recalculate(affectedMonths: Month[]): void {
    const { expenses, income, balance, transactions } = this.state;

    // Track which entries were modified so we can update their totals
    const modifiedEntries = new Set<BudgetEntry>();

    for (const m of affectedMonths) {
      // Step 1: For each expense category (excluding "Gastos Total"),
      // sum all Transaction.valor where mes === m && categoria === cat in integer minor units; store as negative value
      for (const cat of Object.keys(expenses)) {
        if (cat === 'Gastos Total') continue;
        const expenseEntry = expenses[cat];
        if (!expenseEntry) continue;

        const sumMinor = transactions
          .filter(t => t.mes === m && t.categoria === cat)
          .reduce((acc, t) => acc + majorToMinor(t.valor), 0);

        expenseEntry.monthlyValues[m] = sumMinor === 0 ? 0 : minorToMajor(-sumMinor);
        modifiedEntries.add(expenseEntry);
      }

      // Step 2: Recalculate "Gastos Total" for m as sum of all category values for m in integer minor units
      const gastosTotalMinor = Object.entries(expenses)
        .filter(([cat]) => cat !== 'Gastos Total')
        .reduce((acc, [, entry]) => acc + majorToMinor(entry.monthlyValues[m]), 0);
      const gastosTotal = minorToMajor(gastosTotalMinor);

      const gastosTotalEntry = expenses['Gastos Total'];
      if (gastosTotalEntry) {
        gastosTotalEntry.monthlyValues[m] = gastosTotal;
        modifiedEntries.add(gastosTotalEntry);
      }

      // Step 3: Recalculate balance.monthlyValues[m] = income total for m + expenses["Gastos Total"].monthlyValues[m]
      const incomeTotalMinor = Object.values(income).reduce(
        (acc, entry) => acc + majorToMinor(entry.monthlyValues[m]),
        0
      );

      balance.monthlyValues[m] = minorToMajor(incomeTotalMinor + gastosTotalMinor);
      modifiedEntries.add(balance);
    }

    // Step 4: After all months, recalculate entry.total for every modified entry
    // as sum of 12 monthly values in integer minor units
    for (const entry of modifiedEntries) {
      const totalMinor = MONTHS.reduce((acc, mo) => acc + majorToMinor(entry.monthlyValues[mo]), 0);
      entry.total = minorToMajor(totalMinor);
    }
  }

  getBudgetData(): BudgetData {
    // Return a deep copy to prevent external mutation
    return JSON.parse(JSON.stringify({
      metadata: this.state.metadata,
      income: this.state.income,
      expenses: this.state.expenses,
      balance: this.state.balance,
    }));
  }

  getTransactions(): Transaction[] {
    // Return a copy to prevent external mutation
    return this.state.transactions.map(t => ({ ...t }));
  }

  addTransaction(t: Omit<Transaction, 'id'>): Transaction {
    const created: Transaction = { ...t, id: crypto.randomUUID() };
    this.state.transactions.push(created);
    this.recalculate([t.mes]);
    return { ...created };
  }

  addTransactions(ts: Omit<Transaction, 'id'>[]): ImportReport {
    const added: Transaction[] = [];
    const affectedMonths = new Set<Month>();
    let skipped = 0;

    for (const t of ts) {
      const isDuplicate = this.state.transactions.some(
        existing =>
          existing.data === t.data &&
          existing.categoria === t.categoria &&
          existing.descricao === t.descricao &&
          existing.valor === t.valor
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      const created = { ...t, id: crypto.randomUUID() };
      added.push(created);
      this.state.transactions.push(created);
      affectedMonths.add(t.mes);
    }

    if (added.length > 0) {
      this.recalculate(Array.from(affectedMonths));
    }

    return { imported: added.length, skipped };
  }

  updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>): Transaction {
    const index = this.state.transactions.findIndex(t => t.id === id);
    const existing = index !== -1 ? this.state.transactions[index] : undefined;
    if (index === -1 || !existing) {
      throw new Error(`Transaction with id "${id}" not found`);
    }

    const updated: Transaction = { ...existing, ...patch };
    this.state.transactions[index] = updated;

    // Recalculate both old and new months if the month changed
    const affectedMonths: Month[] =
      patch.mes && patch.mes !== existing.mes
        ? [existing.mes, patch.mes]
        : [updated.mes];

    this.recalculate(affectedMonths);
    return { ...updated };
  }

  deleteTransaction(id: string): void {
    const index = this.state.transactions.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Transaction with id "${id}" not found`);
    }

    const [removed] = this.state.transactions.splice(index, 1);
    if (removed) {
      this.recalculate([removed.mes]);
    }
  }

  updateMetadata(m: Partial<BudgetMetadata>): BudgetMetadata {
    this.state.metadata = { ...this.state.metadata, ...m };
    return { ...this.state.metadata };
  }
}
