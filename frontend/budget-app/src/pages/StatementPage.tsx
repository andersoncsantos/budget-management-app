import { useState, useMemo, useRef, useEffect } from 'react';
import { useBudget } from '../context/useBudget';
import {
  Search,
  Filter,
  Calendar,
  Edit,
  Trash2,
  FileText,
  Tag,
  DollarSign,
  File,
  Plus,
  UploadCloud,
  ArrowUpDown,
  Rows3,
  Rows4,
} from 'lucide-react';
import type { Transaction } from '../services/IBudgetService';
import ImportModal from '../components/ImportModal';
import AddTransactionModal from '../components/AddTransactionModal';
import { CategoryBadge } from '../components/ui/category-badge';
import { Dialog } from '../shared/ui/Dialog';
import { MoneyDisplay } from '../shared/ui/MoneyDisplay';
import { majorToMinor, minorToMajor } from '../shared/lib/money';
import {
  buildSanitizedStatementCsv,
  buildSanitizedStatementPrintHtml,
} from '../shared/lib/exportSanitizer';
import { usePortalUrlState } from '../shared/hooks/usePortalUrlState';
import { parseISODateParts } from '../features/budgets';

type TableDensity = 'comfortable' | 'compact';
type StatementSortField = 'date' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';

const DENSITY_STORAGE_KEY = 'budget-app:table-density';

const BANCO_COLORS: Record<string, string> = {
  Itaú: 'text-warning',
  Bradesco: 'text-error',
  Nubank: 'text-primary',
  Caixa: 'text-primary',
  'Mercado Pago': 'text-info',
  PicPay: 'text-positive',
  Inter: 'text-warning',
  Santander: 'text-error',
};

const bancoBadgeClass = (banco: string) => BANCO_COLORS[banco] ?? 'text-text-muted';

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-focus-ring focus:border-transparent outline-none transition-all bg-bg-input text-text-primary placeholder:text-text-placeholder text-sm';

interface EditModalProps {
  transaction: Transaction;
  categories: string[];
  onSave: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  onClose: () => void;
}

const BANKS = [
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

const EditTransactionModal = ({
  transaction,
  categories,
  onSave,
  onClose,
}: EditModalProps) => {
  const initial = {
    category: transaction.categoria,
    description: transaction.descricao ?? '',
    amount: String(transaction.valor),
    date: transaction.data,
    banco: transaction.banco ?? '',
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const isDirty =
    form.category !== initial.category ||
    form.description !== initial.description ||
    form.amount !== initial.amount ||
    form.date !== initial.date ||
    form.banco !== initial.banco;

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.category) errs.category = 'Obrigatório.';
    const desc = form.description.trim();
    if (!desc) errs.description = 'Obrigatório.';
    else if (desc.length < 3) errs.description = 'Mín 3 caracteres.';
    else if (desc.length > 255) errs.description = 'Máx 255 caracteres.';
    if (!form.amount) errs.amount = 'Obrigatório.';
    else if (Number.isNaN(Number.parseFloat(form.amount))) errs.amount = 'Número inválido.';
    if (!form.date) errs.date = 'Obrigatório.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave(transaction.id, {
      categoria: form.category,
      descricao: form.description.trim(),
      valor: Number.parseFloat(form.amount),
      data: form.date,
      banco: form.banco || undefined,
    });
  };

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <Dialog
        isOpen
        onClose={handleClose}
        title="Editar Transação"
        description={`#${transaction.id.slice(0, 8)}`}
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-tx-form"
              className="px-5 py-2 text-sm font-semibold text-text-inverse bg-primary hover:bg-primary-hover rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors shadow-sm"
            >
              Salvar Alterações
            </button>
          </>
        }
      >
        <form id="edit-tx-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="edit-tx-category"
                className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Categoria
              </label>
              <select
                id="edit-tx-category"
                value={form.category}
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? 'edit-tx-category-error' : undefined}
                onChange={(e) => set('category', e.target.value)}
                className={`${inputClass} appearance-none`}
              >
                <option value="" disabled>
                  Selecione a categoria
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="edit-tx-category-error" className="text-xs text-error">
                  {errors.category}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-tx-amount"
                className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> Valor
              </label>
              <input
                id="edit-tx-amount"
                type="number"
                step="0.01"
                value={form.amount}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? 'edit-tx-amount-error' : undefined}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
              {errors.amount && (
                <p id="edit-tx-amount-error" className="text-xs text-error">
                  {errors.amount}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="edit-tx-description"
              className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Descrição
            </label>
            <input
              id="edit-tx-description"
              type="text"
              value={form.description}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? 'edit-tx-description-error' : 'edit-tx-description-hint'
              }
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descrição da transação"
              maxLength={255}
              className={inputClass}
            />
            {errors.description ? (
              <p id="edit-tx-description-error" className="text-xs text-error">
                {errors.description}
              </p>
            ) : (
              <p id="edit-tx-description-hint" className="text-xs text-text-muted">
                {form.description.length}/255
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="edit-tx-date"
                className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Data da Transação
              </label>
              <input
                id="edit-tx-date"
                type="date"
                value={form.date}
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? 'edit-tx-date-error' : undefined}
                onChange={(e) => set('date', e.target.value)}
                className={inputClass}
              />
              {errors.date && (
                <p id="edit-tx-date-error" className="text-xs text-error">
                  {errors.date}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-tx-bank"
                className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> Banco{' '}
                <span className="text-text-muted font-normal">(opcional)</span>
              </label>
              <select
                id="edit-tx-bank"
                value={form.banco}
                onChange={(e) => set('banco', e.target.value)}
                className={`${inputClass} appearance-none`}
              >
                <option value="">— Nenhum —</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Dialog>

      {showUnsavedWarning && (
        <Dialog
          isOpen
          onClose={() => setShowUnsavedWarning(false)}
          title="Descartar alterações?"
          description="Você tem alterações não salvas. Tem certeza que deseja fechar sem salvar?"
          maxWidthClass="max-w-sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-sm font-semibold text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-elevated transition-colors"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-text-inverse bg-error hover:bg-error-hover rounded-lg transition-colors"
              >
                Descartar
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            As modificações feitas neste formulário serão perdidas.
          </p>
        </Dialog>
      )}
    </>
  );
};

const StatementPage = () => {
  const { transactions, deleteTransaction, updateTransaction, getCategories } = useBudget();
  const {
    period,
    activeMonths,
    periodLabel,
    globalQuery,
    searchParams,
    setSearchParams,
  } = usePortalUrlState();

  // Derive table filter, sort, and pagination state from URL search params (§3.1, §8)
  const searchTerm = globalQuery;
  const categoryFilter = searchParams.get('category') || 'All';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const sortField: StatementSortField =
    (searchParams.get('sort') as StatementSortField) === 'amount' ||
    (searchParams.get('sort') as StatementSortField) === 'category'
      ? (searchParams.get('sort') as StatementSortField)
      : 'date';
  const sortDirection: SortDirection =
    searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const itemsPerPage = 15;
  const [showActionButtons, setShowActionButtons] = useState(
    () => window.localStorage.getItem('statement.showActionsColumn') !== 'false'
  );
  const [density, setDensity] = useState<TableDensity>(() => {
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === 'compact' ? 'compact' : 'comfortable';
  });
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const selectAllRef = useRef<HTMLInputElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTransactionIds, setDeleteTransactionIds] = useState<string[]>([]);

  const categoryList = useMemo(() => getCategories(), [getCategories]);
  const categories = useMemo(() => ['All', ...categoryList], [categoryList]);

  const updateUrlParams = (updates: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(updates)) {
          if (v === null || v === '') {
            next.delete(k);
          } else {
            next.set(k, v);
          }
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleSearchChange = (value: string) => {
    updateUrlParams({ q: value || null, page: null });
  };

  const handleCategoryFilterChange = (value: string) => {
    updateUrlParams({
      category: value === 'All' ? null : value,
      page: null,
    });
  };

  const setDateFilter = (key: 'start' | 'end', value: string) => {
    updateUrlParams({ [key]: value || null, page: null });
  };

  const handleSort = (field: StatementSortField) => {
    const nextDir: SortDirection =
      sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';
    updateUrlParams({
      sort: field === 'date' ? null : field,
      dir: nextDir === 'desc' ? null : nextDir,
    });
  };

  const setPage = (page: number) => {
    updateUrlParams({ page: page <= 1 ? null : String(page) });
  };

  const handleDensityChange = (next: TableDensity) => {
    setDensity(next);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
  };

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return transactions
      .filter((tx) => {
        const matchesSearch =
          !query ||
          (tx.descricao ?? '').toLowerCase().includes(query) ||
          tx.categoria.toLowerCase().includes(query) ||
          (tx.banco ?? '').toLowerCase().includes(query);
        const matchesCategory =
          categoryFilter === 'All' || tx.categoria === categoryFilter;
        const matchesDate =
          (!startDate || tx.data >= startDate) && (!endDate || tx.data <= endDate);

        let matchesPeriod = true;
        if (period !== 'YEAR') {
          const parsed = parseISODateParts(tx.data);
          const effectiveMonth = parsed?.month ?? tx.mes;
          matchesPeriod = activeMonths.includes(effectiveMonth);
        }

        return matchesSearch && matchesCategory && matchesDate && matchesPeriod;
      })
      .sort((a, b) => {
        let cmp: number;
        if (sortField === 'date') {
          cmp = a.data.localeCompare(b.data);
        } else if (sortField === 'category') {
          cmp = a.categoria.localeCompare(b.categoria, 'pt-BR');
        } else {
          cmp = majorToMinor(a.valor) - majorToMinor(b.valor);
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [
    transactions,
    searchTerm,
    categoryFilter,
    startDate,
    endDate,
    period,
    activeMonths,
    sortField,
    sortDirection,
  ]);

  // Integer minor-unit summary across filtered transactions for table footer reconciliation (§5.7, §8)
  const filteredTotals = useMemo(() => {
    let incomeMinor = 0;
    let expenseMinor = 0;
    for (const tx of filteredTransactions) {
      const minor = majorToMinor(tx.valor);
      if (minor >= 0) {
        incomeMinor += minor;
      } else {
        expenseMinor += minor;
      }
    }
    return {
      income: minorToMajor(incomeMinor),
      expenses: minorToMajor(expenseMinor),
      net: minorToMajor(incomeMinor + expenseMinor),
    };
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedTransactionIds.length > 0 &&
        selectedTransactionIds.length < paginatedTransactions.length;
    }
  }, [selectedTransactionIds, paginatedTransactions]);

  const exportCSV = () => {
    const csvContent = buildSanitizedStatementCsv(filteredTransactions);
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statement.csv';
    a.click();
    URL.revokeObjectURL(url);
    setLiveAnnouncement(
      `Exportação CSV concluída com ${filteredTransactions.length} transações.`
    );
  };

  const exportPDF = () => {
    const tableHTML = buildSanitizedStatementPrintHtml(
      filteredTransactions,
      new Date().toLocaleDateString('pt-BR')
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    setLiveAnnouncement('Documento PDF preparado para impressão.');
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds((prev) => [...prev, id]);
    } else {
      setSelectedTransactionIds((prev) => prev.filter((tid) => tid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds(paginatedTransactions.map((tx) => tx.id));
    } else {
      setSelectedTransactionIds([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedTransactionIds([]);
  };

  const handleDeleteSelected = () => {
    setDeleteTransactionIds([...selectedTransactionIds]);
    setIsDeleteModalOpen(true);
  };

  const handleOpenEditModal = (id: string) => {
    setEditTransactionId(id);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditTransactionId(null);
  };

  const handleOpenDeleteModal = (id: string) => {
    setDeleteTransactionIds([id]);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTransactionIds([]);
  };

  const handleConfirmDelete = () => {
    const count = deleteTransactionIds.length;
    deleteTransactionIds.forEach((id) => {
      deleteTransaction(id);
    });
    handleCloseDeleteModal();
    setSelectedTransactionIds([]);
    setLiveAnnouncement(
      count === 1
        ? '1 transação excluída com sucesso.'
        : `${count} transações excluídas com sucesso.`
    );
  };

  const getAriaSort = (
    field: StatementSortField
  ): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const cellPadding = density === 'compact' ? 'py-2 px-4' : 'py-3 px-4';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Screen-reader live region for async/mutation announcements (§9) */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">
              Extrato
            </h1>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-light text-primary border border-primary/20">
              {periodLabel}
            </span>
          </div>
          <p className="text-text-secondary text-lg mt-2">
            Registro cronológico detalhado de todos os movimentos financeiros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Adicionar Transação
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            Importar
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <File className="w-4 h-4" aria-hidden="true" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-2 flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" />
          <label htmlFor="statement-search-input" className="sr-only">
            Pesquisar descrições ou categorias
          </label>
          <input
            id="statement-search-input"
            type="text"
            placeholder="Pesquisar descrições ou categorias..."
            className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary placeholder:text-text-placeholder"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" />
          <label htmlFor="statement-category-filter" className="sr-only">
            Filtrar por categoria
          </label>
          <select
            id="statement-category-filter"
            aria-label="Filtrar por categoria"
            className="flex-1 py-3 outline-none bg-transparent text-sm appearance-none text-text-primary cursor-pointer"
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'Todas as categorias' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
            <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" />
            <label htmlFor="statement-start-date" className="sr-only">
              Data inicial
            </label>
            <input
              id="statement-start-date"
              type="date"
              aria-label="Data inicial"
              className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary"
              value={startDate}
              onChange={(e) => setDateFilter('start', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
            <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" />
            <label htmlFor="statement-end-date" className="sr-only">
              Data final
            </label>
            <input
              id="statement-end-date"
              type="date"
              aria-label="Data final"
              className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary"
              value={endDate}
              onChange={(e) => setDateFilter('end', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={showActionButtons}
            aria-label="Alternar visibilidade da coluna de ações"
            onClick={() => {
              const next = !showActionButtons;
              setShowActionButtons(next);
              window.localStorage.setItem('statement.showActionsColumn', String(next));
            }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 ${
              showActionButtons ? 'bg-primary' : 'bg-text-disabled'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                showActionButtons ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-text-secondary select-none">
            Mostrar Coluna de Ações
          </span>
        </div>

        {/* Table Density Toggle (§6.2) */}
        <div
          role="group"
          aria-label="Densidade da tabela"
          className="inline-flex items-center bg-bg-card border border-border-default rounded-xl p-1 shadow-sm"
        >
          <button
            type="button"
            onClick={() => handleDensityChange('comfortable')}
            aria-pressed={density === 'comfortable'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              density === 'comfortable'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Rows3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Confortável</span>
          </button>
          <button
            type="button"
            onClick={() => handleDensityChange('compact')}
            aria-pressed={density === 'compact'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              density === 'compact'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Rows4 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compacta</span>
          </button>
        </div>
      </div>

      {selectedTransactionIds.length > 0 && (
        <div className="mb-4 p-4 bg-primary-light rounded-lg border border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {selectedTransactionIds.length} transação
              {selectedTransactionIds.length !== 1 ? 'ões' : ''} selecionada
              {selectedTransactionIds.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-sm font-medium bg-error-light hover:bg-error/20 text-error rounded"
              >
                Excluir Selecionadas
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 text-sm font-medium bg-bg-card hover:bg-bg-elevated text-text-secondary rounded"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-bg-card rounded-2xl border border-border-default shadow-sm">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <caption className="sr-only">
            Extrato de transações financeiras ({periodLabel})
          </caption>
          <thead className="bg-bg-elevated border-b border-border-default">
            <tr>
              <th
                scope="col"
                className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-8`}
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={
                    selectedTransactionIds.length === paginatedTransactions.length &&
                    paginatedTransactions.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-primary rounded focus:ring-focus-ring"
                  aria-label="Selecionar todas as transações da página"
                />
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('date')}
                className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-32`}
              >
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  className="inline-flex items-center gap-1.5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                >
                  <span>Data</span>
                  <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('category')}
                className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-44`}
              >
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="inline-flex items-center gap-1.5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                >
                  <span>Categoria</span>
                  <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </th>
              <th
                scope="col"
                className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs`}
              >
                Descrição
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('amount')}
                className={`${cellPadding} text-right font-semibold text-text-secondary uppercase tracking-wider text-xs w-36`}
              >
                <button
                  type="button"
                  onClick={() => handleSort('amount')}
                  className="inline-flex items-center justify-end gap-1.5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded ml-auto"
                >
                  <span>Valor</span>
                  <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </th>
              <th
                scope="col"
                className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-32`}
              >
                Banco
              </th>
              {showActionButtons && (
                <th
                  scope="col"
                  className={`${cellPadding} text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-24`}
                >
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-bg-elevated/30 transition-colors">
                  <td className={`${cellPadding} text-left`}>
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.includes(tx.id)}
                      onChange={(e) => handleCheckboxChange(tx.id, e.target.checked)}
                      className="h-4 w-4 text-primary rounded focus:ring-focus-ring"
                      aria-label={`Selecionar transação ${tx.descricao || tx.categoria} de ${tx.data}`}
                    />
                  </td>
                  <td
                    className={`${cellPadding} text-text-secondary font-medium tabular-nums`}
                  >
                    {tx.data}
                  </td>
                  <td className={cellPadding}>
                    <CategoryBadge categoria={tx.categoria} />
                  </td>
                  <td
                    className={`${cellPadding} text-text-primary max-w-xs truncate`}
                    title={tx.descricao ?? ''}
                  >
                    {tx.descricao}
                  </td>
                  <td
                    className={`${cellPadding} text-right font-mono font-semibold tabular-nums ${
                      tx.valor >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    <MoneyDisplay value={tx.valor} signDisplay="exceptZero" />
                  </td>
                  <td
                    className={`${cellPadding} text-sm font-semibold ${
                      tx.banco ? bancoBadgeClass(tx.banco) : 'text-text-disabled'
                    }`}
                  >
                    {tx.banco ?? '—'}
                  </td>
                  {showActionButtons && (
                    <td className={`${cellPadding} text-left space-x-2`}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(tx.id)}
                        className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
                        title="Editar transação"
                        aria-label={`Editar transação ${tx.descricao || tx.categoria}`}
                      >
                        <Edit className="w-4 h-4 text-primary" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(tx.id)}
                        className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
                        title="Excluir transação"
                        aria-label={`Excluir transação ${tx.descricao || tx.categoria}`}
                      >
                        <Trash2 className="w-4 h-4 text-error" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={showActionButtons ? 7 : 6}
                  className="py-12 text-center text-text-muted italic"
                >
                  Nenhuma transação encontrada com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
          {filteredTransactions.length > 0 && (
            <tfoot>
              <tr className="bg-bg-elevated/70 border-t-2 border-border-default font-bold">
                <td colSpan={4} className={`${cellPadding} text-right text-xs uppercase tracking-wider text-text-secondary`}>
                  Total Filtrado ({filteredTransactions.length} {filteredTransactions.length === 1 ? 'registro' : 'registros'}):
                </td>
                <td
                  className={`${cellPadding} text-right font-mono tabular-nums text-xs ${
                    filteredTotals.net >= 0 ? 'text-positive' : 'text-negative'
                  }`}
                >
                  <MoneyDisplay value={filteredTotals.net} signDisplay="exceptZero" />
                </td>
                <td colSpan={showActionButtons ? 2 : 1} className={`${cellPadding} text-xs text-text-muted font-normal`}>
                  <span className="text-positive font-semibold">
                    +<MoneyDisplay value={filteredTotals.income} />
                  </span>
                  {' / '}
                  <span className="text-negative font-semibold">
                    <MoneyDisplay value={filteredTotals.expenses} />
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-between px-4">
        <p className="text-sm text-text-muted">
          Mostrando {paginatedTransactions.length} de {filteredTransactions.length}{' '}
          transações (Página {safeCurrentPage} de {totalPages})
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setPage(safeCurrentPage - 1)}
            className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bg-elevated transition-colors text-text-secondary"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages || filteredTransactions.length === 0}
            onClick={() => setPage(safeCurrentPage + 1)}
            className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bg-elevated transition-colors text-text-secondary"
          >
            Próximo
          </button>
        </div>
      </div>

      {isEditModalOpen &&
        editTransactionId !== null &&
        (() => {
          const tx = transactions.find((t) => t.id === editTransactionId);
          if (!tx) return null;
          return (
            <EditTransactionModal
              transaction={tx}
              categories={getCategories()}
              onSave={(id, patch) => {
                updateTransaction(id, patch);
                handleCloseEditModal();
                setLiveAnnouncement('Transação atualizada com sucesso.');
              }}
              onClose={handleCloseEditModal}
            />
          );
        })()}

      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={
          deleteTransactionIds.length === 1
            ? 'Excluir Transação'
            : 'Excluir Transações'
        }
        description="Esta ação não pode ser desfeita."
        maxWidthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseDeleteModal}
              className="px-4 py-2 bg-bg-card border border-border-default hover:bg-bg-elevated text-text-secondary rounded-lg text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-error hover:bg-error-hover text-text-inverse rounded-lg text-sm font-semibold"
            >
              {deleteTransactionIds.length === 1 ? 'Excluir' : 'Excluir Todas'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {deleteTransactionIds.length === 1
            ? 'Tem certeza que deseja excluir esta transação?'
            : `Tem certeza que deseja excluir as ${deleteTransactionIds.length} transações selecionadas?`}
        </p>
      </Dialog>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default StatementPage;
