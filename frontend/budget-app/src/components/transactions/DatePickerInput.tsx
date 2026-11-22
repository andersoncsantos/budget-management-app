import { useId } from 'react';
import { CalendarDays } from 'lucide-react';
import type { DatePickerInputProps } from './DatePickerInput.types';

const formatPtBR = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

export const DatePickerInput = ({
  value,
  onChange,
  error,
  label = 'Data da Transação',
  helperText,
}: DatePickerInputProps) => {
  const id = useId();

  return (
    <div className="space-y-2" lang="pt-BR">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-text-secondary flex items-center gap-2 ml-1"
      >
        <CalendarDays className="w-4 h-4 text-text-muted" aria-hidden="true" />
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="date"
          lang="pt-BR"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-label={`${label}${value ? `, atualmente ${formatPtBR(value)}` : ''}`}
          className={`w-full px-4 py-3 pr-12 rounded-xl border bg-bg-input text-text-secondary outline-none transition-all duration-150 hover:border-border-hover focus:border-focus-ring focus:ring-2 focus:ring-focus-ring/30 ${
            error ? 'border-error bg-bg-error focus:ring-error/30' : 'border-border-default'
          }`}
        />
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error font-medium ml-1">
          {error}
        </p>
      ) : value ? (
        <p className="text-xs text-text-muted ml-1 tabular-nums">
          Selecionado: <span className="font-medium text-text-secondary">{formatPtBR(value)}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted ml-1">{helperText}</p>
      ) : null}
    </div>
  );
};
