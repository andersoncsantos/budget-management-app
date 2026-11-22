import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MinusCircle, ArrowRight } from 'lucide-react';
import { useBudget } from '../context/useBudget';
import { useTheme } from '../context/ThemeContext';
import { formatBRL } from '../utils/currency';
import { getCategoryStyle } from '../lib/category-styles';
import type { Month } from '../budgetData';
import {
  calculateCategoryConsumptionRows,
  calculateCategoryDistribution,
  calculateKpiSummary,
  calculateMonthlyTrend,
  groupDonutDistribution,
  type CategoryDistributionItem,
  type MonthlyTrendPoint,
} from '../features/budgets';
import { ChartCard, type ChartTableColumn } from '../shared/charts/ChartCard';
import { MoneyDisplay } from '../shared/ui/MoneyDisplay';
import { CategoryBadge } from './ui/category-badge';
import { usePortalUrlState } from '../shared/hooks/usePortalUrlState';

export interface AnalyticsSectionProps {
  readonly activeMonths?: readonly Month[];
  readonly periodLabel?: string;
}

const DISTRIBUTION_COLUMNS: readonly ChartTableColumn<CategoryDistributionItem>[] = [
  {
    key: 'name',
    header: 'Categoria',
    renderCell: (row) => <CategoryBadge categoria={row.name} />,
  },
  {
    key: 'value',
    header: 'Valor (R$)',
    align: 'right',
    renderCell: (row) => <MoneyDisplay value={row.value} />,
  },
  {
    key: 'percentage',
    header: '% do Total',
    align: 'right',
    renderCell: (row) => `${row.percentage.toFixed(1).replace('.', ',')}%`,
  },
];

const TREND_COLUMNS: readonly ChartTableColumn<MonthlyTrendPoint>[] = [
  {
    key: 'month',
    header: 'Mês',
    renderCell: (row) => <span className="font-semibold">{row.name}</span>,
  },
  {
    key: 'income',
    header: 'Receitas (R$)',
    align: 'right',
    renderCell: (row) => (
      <span className="text-positive font-semibold">
        +<MoneyDisplay value={row.Income} />
      </span>
    ),
  },
  {
    key: 'expenses',
    header: 'Despesas (R$)',
    align: 'right',
    renderCell: (row) => (
      <span className="text-negative font-semibold">
        -<MoneyDisplay value={row.Expenses} />
      </span>
    ),
  },
  {
    key: 'net',
    header: 'Saldo Líquido (R$)',
    align: 'right',
    renderCell: (row) => (
      <span className={`font-bold ${row.Net >= 0 ? 'text-positive' : 'text-negative'}`}>
        <MoneyDisplay value={row.Net} signDisplay="exceptZero" />
      </span>
    ),
  },
];

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  activeMonths: activeMonthsProp,
  periodLabel: periodLabelProp,
}) => {
  const { data } = useBudget();
  const { theme } = useTheme();
  const urlState = usePortalUrlState();

  const resolvedMonths = activeMonthsProp ?? urlState.activeMonths;
  const resolvedPeriodLabel = periodLabelProp ?? urlState.periodLabel;
  const unitAndPeriodSubtitle = `BRL (R$) · ${resolvedPeriodLabel}`;

  const distribution = calculateCategoryDistribution(data, resolvedMonths);
  const donutSegments = groupDonutDistribution(distribution, 6);
  const { totalExpenses } = calculateKpiSummary(data, resolvedMonths);
  const consumptionRows = calculateCategoryConsumptionRows(data, resolvedMonths);
  const trendData = calculateMonthlyTrend(data, resolvedMonths);

  const hasExpenseData = distribution.length > 0 && totalExpenses > 0;
  const hasTrendData = trendData.some((pt) => pt.Income > 0 || pt.Expenses > 0);
  const isDark = theme === 'dark';

  const detailsHref =
    urlState.period !== 'YEAR' ? `/details?period=${urlState.period}` : '/details';

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Distribuição de Gastos"
          subtitle={unitAndPeriodSubtitle}
          description="Participação das principais categorias no total de despesas (máx. 6 segmentos no anel)."
          isEmpty={!hasExpenseData}
          emptyMessage="Nenhuma despesa encontrada para o período selecionado"
          emptyHint="Adicione transações ou altere o filtro de período para ver a distribuição."
          tableData={distribution}
          tableColumns={DISTRIBUTION_COLUMNS}
          getRowKey={(row) => row.name}
          tableCaption={`Distribuição de Gastos por Categoria — ${unitAndPeriodSubtitle}`}
        >
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutSegments}
                  cx="50%"
                  cy="46%"
                  innerRadius={64}
                  outerRadius={102}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {donutSegments.map((entry) => {
                    const style = getCategoryStyle(entry.name);
                    const color = isDark ? style.colorDark : style.colorLight;
                    return <Cell key={`cell-${entry.name}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderColor: 'var(--color-border-default)',
                    color: 'var(--color-text-primary)',
                    borderRadius: '12px',
                  }}
                  formatter={(value) => formatBRL(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total label inside Donut ring (§6.1, Appendix B) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[46%] -translate-y-1/2 flex flex-col items-center justify-center text-center"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Total Gasto
              </span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                <MoneyDisplay value={totalExpenses} compact />
              </span>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Tendência Mensal"
          subtitle={unitAndPeriodSubtitle}
          description="Comparativo mensal entre receitas e despesas com escala iniciada em zero."
          isEmpty={!hasTrendData}
          emptyMessage="Nenhuma movimentação registrada no período"
          emptyHint="Registre receitas ou despesas para visualizar a tendência mensal."
          tableData={trendData}
          tableColumns={TREND_COLUMNS}
          getRowKey={(row) => row.name}
          tableCaption={`Tendência Mensal de Receitas e Despesas — ${unitAndPeriodSubtitle}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border-default)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 'auto']}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `R$${Number(value) / 1000}k`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border-default)',
                  color: 'var(--color-text-primary)',
                  borderRadius: '12px',
                }}
                formatter={(value) => formatBRL(Number(value))}
              />
              <Legend />
              <Bar
                name="Receitas"
                dataKey="Income"
                fill="var(--color-positive)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="Despesas"
                dataKey="Expenses"
                fill="var(--color-negative)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Category Progress & Variance Breakdown (§6.1, §9, Appendix B) */}
      {hasExpenseData && (
        <section
          aria-label="Consumo por Categoria"
          className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-default space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">
                Consumo por Categoria
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Participação no orçamento e variação em relação à média mensal ({unitAndPeriodSubtitle})
              </p>
            </div>
            <Link
              to={detailsHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg px-2.5 py-1.5"
            >
              <span>Ver detalhamento completo</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consumptionRows.slice(0, 6).map((row) => {
              const barWidth = Math.min(Math.max(row.shareOfTotalPercent, 2), 100);
              const isOverTarget = row.status === 'unfavorable';
              const isUnderTarget = row.status === 'favorable';

              return (
                <div
                  key={row.category}
                  className="p-4 rounded-xl border border-border-subtle bg-bg-input/40 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <CategoryBadge categoria={row.category} />
                    <div className="text-right">
                      <span className="text-sm font-bold text-text-primary tabular-nums">
                        <MoneyDisplay value={row.actual} />
                      </span>
                      <span className="text-xs text-text-muted ml-1.5 tabular-nums">
                        ({row.shareOfTotalPercent.toFixed(1).replace('.', ',')}%)
                      </span>
                    </div>
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`Participação de ${row.category} no total de despesas`}
                    aria-valuenow={Math.round(row.shareOfTotalPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverTarget ? 'bg-negative' : 'bg-primary'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* Non-color-only status indicator: Icon + Text + Color (§6.1, §9) */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted tabular-nums">
                      Referência: <MoneyDisplay value={row.target} />
                    </span>

                    {isOverTarget ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-negative">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Acima da referência ({row.formattedVariancePercent})</span>
                      </span>
                    ) : isUnderTarget ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-positive">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Abaixo da referência ({row.formattedVariancePercent})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-text-muted">
                        <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Dentro da referência</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
