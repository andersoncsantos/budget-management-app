import { Landmark } from 'lucide-react';
import { Combobox } from './Combobox';

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  label?: string;
  error?: string;
  onAddNew?: (value: string) => void;
  clearable?: boolean;
}

export const BankSelect = ({
  value,
  onChange,
  options,
  placeholder,
  label = 'Banco',
  error,
  onAddNew,
  clearable = true,
}: BankSelectProps) => {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      onAddNew={onAddNew}
      options={options}
      placeholder={placeholder}
      label={label}
      icon={<Landmark className="w-4 h-4 text-text-muted" aria-hidden="true" />}
      error={error}
      clearable={clearable}
      optional
      emptyMessage="Nenhum banco encontrado"
      searchPlaceholder="Pesquisar banco..."
    />
  );
};
