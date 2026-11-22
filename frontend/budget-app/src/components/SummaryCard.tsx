import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatBRL } from '../utils/currency';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'danger';
  description?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, color = 'primary', description }) => {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    danger: 'text-danger bg-danger/10',
  };

  return (
    <div className="bg-bg-surface p-6 rounded-lg shadow-sm border border-border flex flex-col gap-3 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-md ${colorMap[color]} transition-colors`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {description && (
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest opacity-70">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
        <div className="text-2xl font-bold text-text-main tabular-nums tracking-tight">
          {formatBRL(value)}
        </div>
      </div>
    </div>
  );
};
