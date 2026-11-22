/**
 * Debug script to check data consistency
 * Run: npx tsx src/debug/checkData.ts
 */
import { LocalStorageAdapter } from '../services/LocalStorageAdapter';

const adapter = new LocalStorageAdapter();
const budgetData = adapter.getBudgetData();
const transactions = adapter.getTransactions();

console.log('=== Data Check ===\n');

// Calculate expenses from transactions for each month
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

for (const month of months) {
  // Sum transactions for this month
  const txExpenses = transactions
    .filter(t => t.mes === month && t.valor < 0)
    .reduce((acc, t) => acc + Math.abs(t.valor), 0);
  
  // Get Gastos Total from stored data
  const storedGastosTotal = Math.abs(budgetData.expenses['Gastos Total']?.monthlyValues[month] || 0);
  
  // Calculate sum of individual categories
  const categorySum = Object.entries(budgetData.expenses)
    .filter(([name]) => name !== 'Gastos Total')
    .reduce((acc, [, entry]) => acc + Math.abs(entry.monthlyValues[month] || 0), 0);
  
  if (txExpenses !== storedGastosTotal || categorySum !== storedGastosTotal) {
    console.log(`⚠️ ${month}:`);
    console.log(`   Transactions: R$ ${txExpenses.toLocaleString('pt-BR')}`);
    console.log(`   Category Sum: R$ ${categorySum.toLocaleString('pt-BR')}`);
    console.log(`   Gastos Total: R$ ${storedGastosTotal.toLocaleString('pt-BR')}`);
  } else {
    console.log(`✅ ${month}: R$ ${txExpenses.toLocaleString('pt-BR')}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total transactions: ${transactions.length}`);
console.log(`Gastos Total annual: R$ ${Math.abs(budgetData.expenses['Gastos Total']?.total || 0).toLocaleString('pt-BR')}`);