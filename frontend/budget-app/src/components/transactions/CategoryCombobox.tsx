import { Tag } from 'lucide-react';
import { Combobox } from './Combobox';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onAddNew?: (value: string) => void;
  options: string[];
  placeholder: string;
  label?: string;
  error?: string;
  isLoading?: boolean;
  clearable?: boolean;
}

export const CategoryCombobox = ({
  value,
  onChange,
  onAddNew,
  options,
  placeholder,
  label = 'Categoria',
  error,
  isLoading,
  clearable = true,
}: CategoryComboboxProps) => {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      onAddNew={onAddNew}
      options={options}
      placeholder={placeholder}
      label={label}
      icon={<Tag className="w-4 h-4 text-text-muted" aria-hidden="true" />}
      error={error}
      isLoading={isLoading}
      clearable={clearable}
      emptyMessage="Nenhuma categoria encontrada"
      searchPlaceholder="Pesquisar categoria..."
    />
  );
};
