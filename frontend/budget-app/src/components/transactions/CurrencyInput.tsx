import { useState } from 'react';
import type { CurrencyInputProps } from './CurrencyInput.types';

export const CurrencyInput = ({
  value,
  onChange,
  error,
  placeholder = '0,00',
  label = 'Valor',
}: CurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setDisplayValue(value);
  }

  const formatFromDigits = (digits: string): string => {
    if (!digits) return '';
    const amount = parseInt(digits, 10) / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');

    if (digits === '') {
      onChange('');
      setDisplayValue('');
      return;
    }

    const numeric = (parseInt(digits, 10) / 100).toFixed(2);
    onChange(numeric);
    setDisplayValue(formatFromDigits(digits));
  };

  const hasValue = displayValue.trim().length > 0;

  return (
    <div className="space-y-2">
      <label
        htmlFor="currency-input"
        className="text-sm font-semibold text-text-secondary flex items-center gap-2 ml-1"
      >
        <span>{label}</span>
      </label>
      <div
        className={`group relative flex items-center bg-bg-input rounded-2xl border transition-all duration-150 focus-within:shadow-sm ${
          error
            ? 'border-error focus-within:ring-2 focus-within:ring-error/30'
            : 'border-border-default focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/30'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pl-4 pr-2 font-semibold select-none transition-colors duration-150 ${
            hasValue ? 'text-text-secondary' : 'text-text-placeholder'
          }`}
        >
          R$
        </span>
        <input
          id="currency-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-label={label}
          className="w-full pr-4 py-4 bg-transparent text-right text-2xl sm:text-3xl font-bold text-text-primary placeholder:text-text-placeholder placeholder:font-normal tracking-tight tabular-nums outline-none transition-transform duration-150 focus:scale-[1.01]"
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error font-medium ml-1">
          {error}
        </p>
      ) : (
        <p className="text-xs text-text-muted ml-1">
          Use apenas números. Ex.: 1500 para R$&nbsp;15,00
        </p>
      )}
    </div>
  );
};
