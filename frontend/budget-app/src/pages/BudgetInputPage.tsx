import { useState, useMemo, useRef, useEffect } from 'react';
import { useBudget } from '../context/useBudget';
import { Save, Calendar, Tag, DollarSign, Info, UploadCloud, FileText, Search, X, ChevronDown } from 'lucide-react';
import ImportModal from '../components/ImportModal';
import type { Transaction } from '../services/IBudgetService';

interface BudgetInputPageProps {
  initialTransaction?: Transaction;
  onComplete?: () => void;
}

const inputClass = 'w-full px-4 py-3 rounded-xl border border-border-default focus:ring-2 focus:ring-focus-ring focus:border-transparent outline-none transition-all bg-bg-input text-text-secondary placeholder:text-text-placeholder';

const todayISO = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  category: '',
  description: '',
  amount: '',
  date: todayISO(),
  banco: '',
});

const buildFormFromTransaction = (tx: Transaction) => ({
  category: tx.categoria,
  description: tx.descricao ?? '',
  amount: String(tx.valor),
  date: tx.data,
  banco: tx.banco ?? '',
});

const CategoryDropdown = ({ 
  value, 
  onChange, 
  categories, 
  error 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  categories: string[];
  error?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    return categories.filter(cat => 
      cat.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${inputClass} appearance-none flex items-center justify-between text-left`}
      >
        <span className={value ? 'text-text-secondary' : 'text-text-placeholder'}>
          {value || 'Selecione uma categoria'}
        </span>
        <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-bg-elevated border border-border-default rounded-xl shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-border-default">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Pesquisar categorias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-lg focus:ring-2 focus:ring-focus-ring focus:border-transparent outline-none bg-bg-input text-text-secondary"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-text-muted hover:text-text-secondary" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredCategories.length > 0 ? (
              <div className="py-1">
                {filteredCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-primary-light transition-colors ${
                      cat === value ? 'bg-primary-light text-primary font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-text-muted text-center">Nenhuma categoria encontrada</p>
            )}
          </div>

          <div className="p-2 border-t border-border-default">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-muted hover:bg-bg-surface rounded-lg transition-colors"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
};

const BudgetInputPage = ({ initialTransaction, onComplete }: BudgetInputPageProps = {}) => {
  const { saveEntry, updateTransaction, getCategories } = useBudget();
  const [formData, setFormData] = useState(() =>
    initialTransaction ? buildFormFromTransaction(initialTransaction) : emptyForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [isAddingNewBank, setIsAddingNewBank] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const categories = getCategories();

  const handleCategoryChange = (value: string) => {
    if (value === '__ADD_NEW__') {
      setIsAddingNewCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setIsAddingNewCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.category) errs.category = 'Categoria é obrigatória.';
    const desc = formData.description.trim();
    if (!desc) errs.description = 'Descrição é obrigatória.';
    else if (desc.length < 3) errs.description = 'Descrição deve ter pelo menos 3 caracteres.';
    else if (desc.length > 255) errs.description = 'Descrição deve ter no máximo 255 caracteres.';
    if (!formData.amount) errs.amount = 'Valor é obrigatório.';
    else if (isNaN(parseFloat(formData.amount))) errs.amount = 'Por favor, digite um número válido.';
    if (!formData.date) errs.date = 'Data é obrigatória.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const entry = {
      category: formData.category,
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      date: formData.date,
      banco: formData.banco || undefined,
    };

    const resetForm = () => {
      setFormData(emptyForm());
      setIsAddingNewCategory(false);
      setIsAddingNewBank(false);
      setErrors({});
    };

    if (initialTransaction) {
      try {
        updateTransaction(initialTransaction.id, entry);
        resetForm();
        if (onComplete) onComplete();
      } catch (err) {
        setErrors({ form: 'Falha ao atualizar transação.' });
        console.error(err);
      }
    } else {
      saveEntry(entry);
      resetForm();
      if (onComplete) onComplete();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">
          {initialTransaction ? 'Editar Transação' : 'Adicionar Transação'}
        </h1>
        <p className="text-text-secondary text-lg">
          Gerencie suas finanças registrando novas receitas ou despesas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-bg-card p-8 rounded-3xl shadow-sm border border-border-default">
          {errors.form && (
            <div className="mb-6 p-4 bg-bg-error border-l-4 border-error text-error rounded-r-lg text-sm flex items-center gap-3">
              <Info className="w-5 h-5 shrink-0" />
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <Tag className="w-4 h-4 text-text-muted" />
                  Categoria
                </label>
                {isAddingNewCategory ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Digite o nome da nova categoria"
                      autoFocus
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-surface rounded"
                    >
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <CategoryDropdown
                      value={formData.category}
                      onChange={handleCategoryChange}
                      categories={categories}
                      error={errors.category}
                    />
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('__ADD_NEW__')}
                      className="mt-2 text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Adicionar Nova Categoria
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-text-muted" />
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className={inputClass}
                />
                {errors.amount && <p className="text-xs text-error">{errors.amount}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-muted" />
                Descrição
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Digite a descrição da transação"
                maxLength={255}
                className={inputClass}
              />
              {errors.description
                ? <p className="text-xs text-error">{errors.description}</p>
                : <p className="text-xs text-text-muted">{formData.description.length}/255</p>
              }
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                Data da Transação
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={inputClass}
              />
              {errors.date && <p className="text-xs text-error">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-text-muted" />
                Banco <span className="text-text-muted font-normal">(opcional)</span>
              </label>
              {isAddingNewBank ? (
                <div className="relative">
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                    placeholder="Digite o nome do banco"
                    autoFocus
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingNewBank(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-surface rounded"
                  >
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ) : (
                <select
                  value={formData.banco}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      setIsAddingNewBank(true);
                      setFormData(prev => ({ ...prev, banco: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, banco: e.target.value }));
                    }
                  }}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">Selecione um banco</option>
                  {['Itaú', 'Bradesco', 'Nubank', 'Caixa', 'Banco do Brasil', 'Santander', 'Inter', 'Mercado Pago', 'PicPay', 'C6 Bank', 'BTG Pactual', 'XP'].map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                  <option value="ADD_NEW" className="font-bold text-primary">+ Adicionar Novo Banco</option>
                </select>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-text-inverse font-bold rounded-2xl transition-all shadow-primary flex items-center justify-center gap-3 active:scale-95"
              >
                <Save className="w-5 h-5" />
                {initialTransaction ? 'Atualizar Transação' : 'Confirmar Transação'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-6 rounded-3xl text-text-inverse shadow-lg">
            <h3 className="text-lg font-bold mb-2">Dica Rápida</h3>
            <p className="text-primary-light/80 text-sm leading-relaxed">
              Use números negativos para despesas e positivos para receitas.
              Categorize seus gastos para obter melhores análises!
            </p>
          </div>
          <div className="bg-bg-card p-6 rounded-3xl border border-border-default">
            <h3 className="text-text-primary font-bold mb-3">Categorias Recentes</h3>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 10).map(cat => (
                <span key={cat} className="px-3 py-1 bg-bg-surface text-text-secondary text-xs font-medium rounded-full border border-border-default">
                  {cat}
                </span>
              ))}
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full mt-6 py-3 px-4 bg-bg-surface hover:bg-bg-elevated text-text-secondary rounded-xl border border-border-default transition-all flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <UploadCloud className="w-4 h-4" />
              Importação em Massa (CSV/PDF)
            </button>
          </div>
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default BudgetInputPage;
