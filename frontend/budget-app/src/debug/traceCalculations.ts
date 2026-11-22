/**
 * Debug script to trace the exact calculations
 * Run: npx tsx src/debug/traceCalculations.ts
 */
import { LocalStorageAdapter } from '../services/LocalStorageAdapter';

const adapter = new LocalStorageAdapter();
const budgetData = adapter.getBudgetData();

console.log('=== Tracing Calculations for Mar ===\n');

// What AnalyticsSection calculates (sum of individual categories)
const analyticsSectionMar = Object.entries(budgetData.expenses)
  .filter(([name]) => name !== 'Gastos Total' && !name.toLowerCase().includes('total'))
  .reduce((acc, [, entry]) => acc + (entry.monthlyValues['Mar'] || 0), 0);

console.log('AnalyticsSection (sum of categories for Mar):');
console.log('  Raw sum (negative):', analyticsSectionMar);
console.log('  With Math.abs():', Math.abs(analyticsSectionMar));

// What DashboardPage uses (Gastos Total annual)
const dashboardPageMar = Math.abs(budgetData.expenses['Gastos Total'].monthlyValues['Mar'] || 0);

console.log('\nDashboardPage - Total Despesas (Gastos Total for Mar):');
console.log('  Value:', dashboardPageMar);

// What BudgetDetailsPage shows
console.log('\nBudgetDetailsPage - Despesas table Mar column:');
Object.entries(budgetData.expenses)
  .filter(([name]) => name !== 'Gastos Total')
  .forEach(([name, entry]) => {
    console.log(`  ${name}: ${entry.monthlyValues['Mar']}`);
  });

console.log('\n  Gastos Total Mar:', budgetData.expenses['Gastos Total'].monthlyValues['Mar']);

// Balance calculation
const incomeMar = Object.values(budgetData.income)
  .reduce((acc, entry) => acc + entry.monthlyValues['Mar'], 0);
const balanceMar = budgetData.balance.monthlyValues['Mar'];

console.log('\nBalance calculation for Mar:');
console.log('  Income:', incomeMar);
console.log('  Expenses (Gastos Total):', budgetData.expenses['Gastos Total'].monthlyValues['Mar']);
console.log('  Balance:', balanceMar);

// Comparison
console.log('\n=== Comparison ===');
console.log('Category Sum (from AnalyticsSection):', Math.abs(analyticsSectionMar));
console.log('Gastos Total (pre-computed):', Math.abs(budgetData.expenses['Gastos Total'].monthlyValues['Mar']));
console.log('Difference:', Math.abs(analyticsSectionMar) - Math.abs(budgetData.expenses['Gastos Total'].monthlyValues['Mar']));