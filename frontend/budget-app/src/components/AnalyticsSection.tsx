import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useBudget } from '../context/useBudget';
import { useTheme } from '../context/ThemeContext';
import { formatBRL } from '../utils/currency';
import { getCategoryStyle } from '../lib/category-styles';

export const AnalyticsSection: React.FC = () => {
  const { data, months, getCategoryDistribution } = useBudget();
  const { theme } = useTheme();
  const distribution = getCategoryDistribution();

  const hasData = distribution && distribution.length > 0 && distribution.some(d => d.value > 0);

  const isDark = theme === 'dark';

  const trendData = months.map(month => {
    const income = Object.values(data.income).reduce((acc, entry) => acc + entry.monthlyValues[month], 0);

    const expenseEntries = Object.entries(data.expenses).filter(([name]) => {
      return name !== 'Gastos Total' && !name.toLowerCase().includes('total');
    });

    const expensesSum = expenseEntries.reduce((acc, [, entry]) => acc + (entry.monthlyValues[month] || 0), 0);
    const expenses = Math.abs(expensesSum);

    return {
      name: month,
      Income: income,
      Expenses: expenses
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-bg-card p-6 rounded-lg shadow-sm border border-border-default transition-all duration-300 hover:shadow-md">
        <h3 className="text-base font-bold text-text-primary mb-6 uppercase tracking-wider">Distribuição de Gastos</h3>
        {hasData ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry) => {
                    const style = getCategoryStyle(entry.name);
                    const color = isDark ? style.colorDark : style.colorLight;
                    return <Cell key={`cell-${entry.name}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', borderRadius: '8px' }}
                  formatter={(value) => formatBRL(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-text-muted">
            <p className="text-center italic">Nenhuma despesa encontrada<br/><span className="text-xs opacity-70">Adicione transações para ver a distribuição</span></p>
          </div>
        )}
      </div>

      <div className="bg-bg-card p-6 rounded-lg shadow-sm border border-border-default transition-all duration-300 hover:shadow-md">
        <h3 className="text-base font-bold text-text-primary mb-6 uppercase tracking-wider">Tendência Mensal</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-default)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `R$${value/1000}k`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', borderRadius: '8px' }}
                formatter={(value) => formatBRL(Number(value))}
              />
              <Legend />
              <Bar dataKey="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="var(--color-error)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
