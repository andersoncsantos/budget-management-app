/**
 * Pi Agent - Dashboard Discrepancy Investigation Example
 * 
 * This example shows how the Pi Agent can use tools to investigate
 * the "Tendência Mensal" dashboard discrepancy.
 * 
 * Usage:
 * npx tsx src/agents/investigateDashboardIssue.ts
 */

import { executeTool } from '../tools/index';

async function investigateDashboardDiscrepancy() {
  console.log('🔍 Starting investigation: Tendência Mensal Dashboard Discrepancy\n');
  
  // Step 1: Use project structure tool to understand the codebase
  console.log('📋 Step 1: Investigating project structure...\n');
  
  const structureResult = await executeTool('project_structure', {
    projectPath: '.',
    generateReport: false, // Just get the summary
  });
  
  console.log(structureResult);
  console.log('\n---\n');
  
  // Step 2: Identify relevant files for the investigation
  console.log('📋 Step 2: Based on the structure, the relevant files are:');
  console.log('   - DashboardPage.tsx (main dashboard)');
  console.log('   - AnalyticsSection.tsx (trends/charts)');
  console.log('   - SummaryCard.tsx (balance display)');
  console.log('   - BudgetContext.tsx (data provider)');
  console.log('   - BudgetDetailsPage.tsx (details view)');
  console.log('\n---\n');
  
  // Step 3: Manual investigation required - need to read source files
  console.log('📋 Step 3: Manual investigation required:');
  console.log('   1. Check AnalyticsSection.tsx for "Tendência Mensal" calculation');
  console.log('   2. Check SummaryCard.tsx for "Saldo Líquido" calculation');
  console.log('   3. Compare how each calculates expenses for 03/2026');
  console.log('   4. Check date filtering logic in BudgetContext');
  console.log('\n---\n');
  
  console.log('✅ Investigation summary ready for manual code review.');
  console.log('   Use the generated PROJECT_STRUCTURE.md for reference.');
}

// Run the investigation
investigateDashboardDiscrepancy().catch(console.error);