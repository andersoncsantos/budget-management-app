import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCategories, useCreateCategory } from '../hooks/useApi';
import { useBudget } from '../context/useBudget';
import type { TransactionType } from '../types/api';
import { TransactionTypeSelector } from './transactions/TransactionTypeSelector';
import { CategoryCombobox } from './transactions/CategoryCombobox';
import { BankSelect } from './transactions/BankSelect';
import { DatePickerInput } from './transactions/DatePickerInput';
import { CurrencyInput } from './transactions/CurrencyInput';
import { DescriptionInput } from './transactions/DescriptionInput';
import { ModalFooter } from './transactions/ModalFooter';

interface FormData {
  category: string;
  description: string;
  amount: string;
  date: string;
  banco: string;
  type: TransactionType;
}

const todayISO = (): string => new Date().toISOString().split('T')[0];

const emptyForm = (): FormData => ({
  category: '',
  description: '',
  amount: '',
  date: todayISO(),
  banco: '',
  type: 'EXPENSE',
});

const DESCRIPTION_MIN = 3;
const DESCRIPTION_MAX = 255;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionForm = ({ onClose, onSuccess }: TransactionFormProps) => {
  const { saveEntry, getCategories } = useBudget();
  const { user } = useAuth();
  const { data: apiCategories = [], isLoading: categoriesLoading } = useCategories(user?.userId);
  const createCategoryMutation = useCreateCategory();

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstInteractiveRef = useRef<HTMLDivElement>(null);

  const categories = apiCategories.length > 0
    ? Array.from(new Set(apiCategories.map((c) => c.name)))
    : getCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstInvalid = Object.keys(errs)[0];
      const selector = `[data-field="${firstInvalid}"]`;
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(selector)?.focus();
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = parseFloat(formData.amount);
      const finalAmount = formData.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);

      let categoryId: string | undefined;

      if (apiCategories.length > 0 && user?.userId) {
        const normalized = formData.category.trim();
        const existing = apiCategories.find(
          (c) => c.name.toLowerCase() === normalized.toLowerCase(),
        );
        if (existing) {
          categoryId = existing.id;
        } else {
          const created = await createCategoryMutation.mutateAsync({
            name: normalized,
            userId: user.userId,
          });
          categoryId = created.id;
        }
      }

      saveEntry({
        category: formData.category,
        categoryId,
        description: formData.description.trim(),
        amount: finalAmount,
        date: formData.date,
        banco: formData.banco || undefined,
      });

      setJustSucceeded(true);
      onSuccess();
    } catch (err) {
      setSubmitError('Falha ao salvar transação. Tente novamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formData.category.trim()) {
      errs.category = 'Categoria é obrigatória.';
    }
    const desc = formData.description.trim();
    if (!desc) {
      errs.description = 'Descrição é obrigatória.';
    } else if (desc.length < DESCRIPTION_MIN) {
      errs.description = `Descrição deve ter pelo menos ${DESCRIPTION_MIN} caracteres.`;
    } else if (desc.length > DESCRIPTION_MAX) {
      errs.description = `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
    }
    if (!formData.amount) {
      errs.amount = 'Valor é obrigatório.';
    } else if (Number.isNaN(parseFloat(formData.amount))) {
      errs.amount = 'Por favor, digite um número válido.';
    }
    if (!formData.date) {
      errs.date = 'Data é obrigatória.';
    }
    return errs;
  };

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const allBanks = (() => {
    const defaultBanks = [
      'Itaú',
      'Bradesco',
      'Nubank',
      'Caixa',
      'Banco do Brasil',
      'Santander',
      'Inter',
      'Mercado Pago',
      'PicPay',
      'C6 Bank',
      'BTG Pactual',
      'XP',
    ];
    const customBanks = categories.filter((cat) =>
      defaultBanks.some((bank) => bank.toLowerCase() === cat.toLowerCase()),
    );
    return Array.from(new Set([...defaultBanks, ...customBanks])).sort();
  })();

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {submitError && (
          <div
            role="alert"
            className="p-3.5 bg-bg-error border-l-4 border-error text-error rounded-r-lg text-sm"
          >
            {submitError}
          </div>
        )}

        <div data-field="type">
          <TransactionTypeSelector
            value={formData.type}
            onChange={(value) => update('type', value)}
          />
        </div>

        {categoriesLoading ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary ml-1">Categoria</label>
            <div className="w-full px-4 py-3 rounded-xl border border-border-default bg-bg-input text-text-muted text-sm">
              Carregando categorias...
            </div>
          </div>
        ) : (
          <div
            ref={firstInteractiveRef}
            tabIndex={-1}
            data-field="category"
            className="focus:outline-none"
          >
            <CategoryCombobox
              value={formData.category}
              onChange={(value) => update('category', value)}
              onAddNew={(value) => update('category', value)}
              options={categories}
              placeholder="Selecione uma categoria"
              error={errors.category}
            />
          </div>
        )}

        <div data-field="amount">
          <CurrencyInput
            value={formData.amount}
            onChange={(value) => update('amount', value)}
            error={errors.amount}
          />
        </div>

        <div data-field="description">
          <DescriptionInput
            value={formData.description}
            onChange={(value) => update('description', value)}
            error={errors.description}
          />
        </div>

        <div data-field="date">
          <DatePickerInput
            value={formData.date}
            onChange={(value) => update('date', value)}
            error={errors.date}
          />
        </div>

        <BankSelect
          value={formData.banco}
          onChange={(value) => update('banco', value)}
          options={allBanks}
          placeholder="Selecione um banco"
          onAddNew={(value) => update('banco', value)}
        />
      </div>

      <ModalFooter
        onCancel={onClose}
        isSubmitting={isSubmitting}
        justSucceeded={justSucceeded}
        submitLabel="Salvar Transação"
        cancelLabel="Cancelar"
      />
    </form>
  );
};
