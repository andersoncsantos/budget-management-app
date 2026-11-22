/**
 * Public surface of the `budgets` feature (§4.1).
 */

export {
  ALL_MONTHS,
  type Quarter,
  type ParsedISODate,
  type PeriodFilter,
  isLeapYear,
  getDaysInMonth,
  parseISODateParts,
  getMonthsForQuarter,
  getQuarterForMonth,
  getYtdMonths,
  getMonthsForPeriod,
  matchesPeriodFilter,
} from './domain/periods';

export {
  type BudgetLineKind,
  type VarianceStatus,
  type VarianceResult,
  formatVariancePercent,
  calculateVariance,
} from './domain/variance';

export {
  TOTAL_EXPENSES_KEY,
  isSyntheticTotalCategory,
  createEmptyMonthlyValues,
  reconcileBudgetData,
  calculateBudgetMatrixFromTransactions,
  type MonthlySummary,
  calculateMonthlySummary,
  type CategoryDistributionItem,
  calculateCategoryDistribution,
  type MonthlyTrendPoint,
  calculateMonthlyTrend,
  type KpiSummary,
  calculateKpiSummary,
  groupDonutDistribution,
  type PeriodDeltaInfo,
  type DashboardPeriodComparison,
  calculateDashboardComparison,
  type CategoryConsumptionRow,
  calculateCategoryConsumptionRows,
} from './domain/rollups';
