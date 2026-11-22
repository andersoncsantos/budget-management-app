import { useBudget } from '../context/useBudget';
import { formatBRL } from '../utils/currency';

export const DebugExpenses = () => {
  const { data } = useBudget();

  return (
    <div className="bg-bg-warning p-4 rounded-lg border border-warning/30 text-sm">
      <h3 className="font-bold text-warning mb-2">Debug: Expense Calculations for Mar</h3>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">AnalyticsSection (sum of categories): </span>
          <span className="font-mono">
            {formatBRL(Math.abs(
              Object.entries(data.expenses)
                .filter(([name]) => name !== 'Gastos Total' && !name.toLowerCase().includes('total'))
                .reduce((acc, [, entry]) => acc + (entry.monthlyValues['Mar'] || 0), 0)
            ))}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Gastos Total Mar: </span>
          <span className="font-mono">
            {formatBRL(Math.abs(data.expenses['Gastos Total']?.monthlyValues['Mar'] || 0))}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Difference: </span>
          <span className="font-mono text-error">
            {formatBRL(
              Math.abs(
                Object.entries(data.expenses)
                  .filter(([name]) => name !== 'Gastos Total' && !name.toLowerCase().includes('total'))
                  .reduce((acc, [, entry]) => acc + (entry.monthlyValues['Mar'] || 0), 0)
              ) - Math.abs(data.expenses['Gastos Total']?.monthlyValues['Mar'] || 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DebugExpenses;
