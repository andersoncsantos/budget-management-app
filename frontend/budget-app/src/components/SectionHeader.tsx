import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SectionVariant = 'income' | 'expense' | 'balance';

interface SectionHeaderProps {
  title: string;
  icon: LucideIcon;
  variant: SectionVariant;
  expanded: boolean;
  onToggle: () => void;
  subtitle?: string;
}

const variantStyles: Record<SectionVariant, { bg: string; iconColor: string; chevronColor: string }> = {
  income: {
    bg: 'bg-success-light',
    iconColor: 'text-success',
    chevronColor: 'text-success',
  },
  expense: {
    bg: 'bg-error-light',
    iconColor: 'text-error',
    chevronColor: 'text-error',
  },
  balance: {
    bg: 'bg-primary-light',
    iconColor: 'text-primary',
    chevronColor: 'text-primary',
  },
};

export const SectionHeader = ({
  title,
  icon: Icon,
  variant,
  expanded,
  onToggle,
  subtitle,
}: SectionHeaderProps) => {
  const styles = variantStyles[variant];

  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onToggle}
        className="p-2 rounded-lg hover:bg-bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        aria-label={expanded ? `Recolher ${title}` : `Expandir ${title}`}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className={`w-5 h-5 ${styles.chevronColor}`} />
        ) : (
          <ChevronRight className={`w-5 h-5 ${styles.chevronColor}`} />
        )}
      </button>
      <div className={`p-2.5 rounded-lg ${styles.bg}`}>
        <Icon className={`w-5 h-5 ${styles.iconColor}`} aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      {subtitle && (
        <span className="text-sm text-text-muted ml-auto hidden sm:inline">
          {subtitle}
        </span>
      )}
    </div>
  );
};
