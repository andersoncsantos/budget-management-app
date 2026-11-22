import { useState, useMemo, useRef, useEffect } from 'react';
import { useBudget } from '../context/useBudget';
import { formatBRL } from '../utils/currency';
import { Search, Filter, Calendar, Edit, Trash2, X, FileText, Tag, DollarSign, File, Plus, UploadCloud } from 'lucide-react';
import type { Transaction } from '../services/IBudgetService';
import ImportModal from '../components/ImportModal';
import AddTransactionModal from '../components/AddTransactionModal';
import { CategoryBadge } from '../components/ui/category-badge';

const BANCO_COLORS: Record<string, string> = {
  'Itaú':         'text-warning',
  'Bradesco':     'text-error',
  'Nubank':       'text-primary',
  'Caixa':        'text-primary',
  'Mercado Pago': 'text-info',
  'PicPay':       'text-success',
  'Inter':        'text-warning',
  'Santander':    'text-error',
};

const bancoBadgeClass = (banco: string) =>
  BANCO_COLORS[banco] ?? 'text-text-muted';

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-focus-ring focus:border-transparent outline-none transition-all bg-bg-input text-text-secondary placeholder:text-text-placeholder text-sm';

interface EditModalProps {
  transaction: Transaction;
  categories: string[];
  onSave: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  onClose: () => void;
}

const BANKS = ['Itaú', 'Bradesco', 'Nubank', 'Caixa', 'Banco do Brasil', 'Santander', 'Inter', 'Mercado Pago', 'PicPay', 'C6 Bank', 'BTG Pactual', 'XP'];

const EditTransactionModal = ({ transaction, categories, onSave, onClose }: EditModalProps) => {
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
    else if (isNaN(parseFloat(form.amount))) errs.amount = 'Número inválido.';
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
      valor: parseFloat(form.amount),
      data: form.date,
      banco: form.banco || undefined,
    });
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-bg-modal w-full max-w-2xl rounded-2xl shadow-xl border border-border-default flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Editar Transação</h2>
            <p className="text-xs text-text-muted font-mono mt-0.5">#{transaction.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-secondary"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="edit-tx-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Categoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="" disabled>Selecione a categoria</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p className="text-xs text-error">{errors.category}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
                {errors.amount && <p className="text-xs text-error">{errors.amount}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Descrição
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Enter transaction description"
                maxLength={255}
                className={inputClass}
              />
              {errors.description
                ? <p className="text-xs text-error">{errors.description}</p>
                : <p className="text-xs text-text-muted">{form.description.length}/255</p>
              }
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data da Transação
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={inputClass}
                />
                {errors.date && <p className="text-xs text-error">{errors.date}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Banco <span className="text-text-muted font-normal">(opcional)</span>
                </label>
                <select
                  value={form.banco}
                  onChange={(e) => set('banco', e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">— None —</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-bg-surface rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-elevated transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-tx-form"
            className="px-5 py-2 text-sm font-semibold text-text-inverse bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
          >
            Salvar Alterações
          </button>
        </div>
      </div>

      {showUnsavedWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-bg-overlay">
          <div className="bg-bg-modal rounded-2xl shadow-xl border border-border-default max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-text-primary">Descartar alterações?</h3>
            <p className="text-sm text-text-secondary">Você tem alterações não salvas. Tem certeza que deseja fechar sem salvar?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-sm font-semibold text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-elevated transition-colors"
              >
                Continuar Editando
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-text-inverse bg-error hover:bg-error-hover rounded-lg transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatementPage = () => {
  const { transactions, deleteTransaction, updateTransaction, getCategories } = useBudget();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [showActionButtons, setShowActionButtons] = useState(() =>
    localStorage.getItem('statement.showActionsColumn') !== 'false'
  );
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

  const setFilter = <K extends keyof typeof dateRange>(key: K, value: string) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch =
        (tx.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || tx.categoria === categoryFilter;
      const matchesDate =
        (!dateRange.start || tx.data >= dateRange.start) &&
        (!dateRange.end || tx.data <= dateRange.end);
      return matchesSearch && matchesCategory && matchesDate;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [transactions, searchTerm, categoryFilter, dateRange]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedTransactionIds.length > 0 &&
        selectedTransactionIds.length < paginatedTransactions.length;
    }
  }, [selectedTransactionIds, paginatedTransactions]);

  const exportCSV = () => {
    const header = 'Date,Category,Description,Amount,Bank';
    const rows = filteredTransactions.map(tx =>
      `${tx.data},"${tx.categoria}","${tx.descricao ?? ''}",${tx.valor},"${tx.banco ?? ''}"`
    );
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    let tableHTML = `
      <html>
      <head>
        <title>Bank Statement</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e293b; margin-bottom: 10px; }
          .date-range { color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .amount-positive { color: #16a34a; }
          .amount-negative { color: #dc2626; }
          .category-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Bank Statement</h1>
        <p class="date-range">Generated on ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
              <th>Bank</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredTransactions.forEach(tx => {
      const amountClass = tx.valor >= 0 ? 'amount-positive' : 'amount-negative';
      const amountPrefix = tx.valor >= 0 ? '+' : '';
      tableHTML += `
        <tr>
          <td>${tx.data}</td>
          <td><span class="category-badge">${tx.categoria}</span></td>
          <td>${tx.descricao ?? '-'}</td>
          <td class="${amountClass}" style="text-align: right;">${amountPrefix}${formatBRL(tx.valor)}</td>
          <td>${tx.banco ?? '-'}</td>
        </tr>
      `;
    });
    
    tableHTML += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds(prev => [...prev, id]);
    } else {
      setSelectedTransactionIds(prev => prev.filter(tid => tid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds(paginatedTransactions.map(tx => tx.id));
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
    deleteTransactionIds.forEach(id => {
      deleteTransaction(id);
    });
    handleCloseDeleteModal();
    setSelectedTransactionIds([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Extrato</h1>
          <p className="text-text-secondary text-lg mt-2">Registro cronológico detalhado de todos os movimentos financeiros.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Transação
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-elevated transition-colors text-sm font-semibold shadow-sm"
          >
            <File className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-2 flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar descrições ou categorias..."
            className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary placeholder:text-text-placeholder"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
          <select
            className="flex-1 py-3 outline-none bg-transparent text-sm appearance-none text-text-primary"
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
            <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="date"
              className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary"
              value={dateRange.start}
              onChange={(e) => setFilter('start', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-xl px-3 focus-within:ring-2 focus-within:ring-focus-ring">
            <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="date"
              className="flex-1 py-3 outline-none bg-transparent text-sm text-text-primary"
              value={dateRange.end}
              onChange={(e) => setFilter('end', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <button
          role="switch"
          aria-checked={showActionButtons}
          aria-label="Alternar visibilidade da coluna de ações"
          onClick={() => {
            const next = !showActionButtons;
            setShowActionButtons(next);
            localStorage.setItem('statement.showActionsColumn', String(next));
          }}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 ${showActionButtons ? 'bg-primary' : 'bg-text-disabled'}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${showActionButtons ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </button>
        <span className="text-sm text-text-secondary select-none">Mostrar Coluna de Ações</span>
      </div>

      {selectedTransactionIds.length > 0 && (
        <div className="mb-4 p-4 bg-primary-light rounded-lg border border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {selectedTransactionIds.length} transação{selectedTransactionIds.length !== 1 ? 's' : ''} selecionada{selectedTransactionIds.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-sm font-medium bg-error-light hover:bg-error/20 text-error rounded"
              >
                Excluir Selecionadas
              </button>
              <button
                onClick={handleClearSelection}
                className="px-3 py-1.5 text-sm font-medium bg-bg-surface hover:bg-bg-elevated text-text-secondary rounded"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-bg-card rounded-2xl border border-border-default shadow-sm">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead className="bg-bg-surface border-b border-border-default">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={selectedTransactionIds.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-primary rounded focus:ring-focus-ring"
                  aria-label="Selecionar todas as transações"
                />
              </th>
              <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-28">Data</th>
              <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-44">Categoria</th>
              <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs">Descrição</th>
              <th className="py-3 px-4 text-right font-semibold text-text-secondary uppercase tracking-wider text-xs w-32">Valor</th>
              <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-32">Banco</th>
              {showActionButtons && (
                <th className="py-3 px-4 text-left font-semibold text-text-secondary uppercase tracking-wider text-xs w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-bg-elevated/30 transition-colors">
                  <td className="py-3 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.includes(tx.id)}
                      onChange={(e) => handleCheckboxChange(tx.id, e.target.checked)}
                      className="h-4 w-4 text-primary rounded focus:ring-focus-ring"
                    />
                  </td>
                  <td className="py-3 px-4 text-text-secondary font-medium tabular-nums">{tx.data}</td>
                  <td className="py-3 px-4">
                    <CategoryBadge categoria={tx.categoria} />
                  </td>
                  <td className="py-3 px-4 text-text-primary max-w-xs truncate" title={tx.descricao ?? ''}>{tx.descricao}</td>
                  <td className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${tx.valor >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatBRL(tx.valor)}
                  </td>
                  <td className={`py-3 px-4 text-sm font-semibold ${tx.banco ? bancoBadgeClass(tx.banco) : 'text-text-disabled'}`}>
                    {tx.banco ?? '—'}
                  </td>
                  {showActionButtons && (
                    <td className="py-3 px-4 text-left space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(tx.id)}
                        className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
                        title="Editar transação"
                        aria-label="Editar transação"
                      >
                        <Edit className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(tx.id)}
                        className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
                        title="Excluir transação"
                        aria-label="Excluir transação"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showActionButtons ? 7 : 6} className="py-12 text-center text-text-muted italic">
                  Nenhuma transação encontrada com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4">
        <p className="text-sm text-text-muted">
          Mostrando {paginatedTransactions.length} de {filteredTransactions.length} transações
        </p>
        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bg-elevated transition-colors text-text-secondary"
          >
            Anterior
          </button>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bg-elevated transition-colors text-text-secondary"
          >
            Próximo
          </button>
        </div>
      </div>

      {isEditModalOpen && editTransactionId !== null && (() => {
        const tx = transactions.find(t => t.id === editTransactionId);
        if (!tx) return null;
        return (
          <EditTransactionModal
            transaction={tx}
            categories={getCategories()}
            onSave={(id, patch) => { updateTransaction(id, patch); handleCloseEditModal(); }}
            onClose={handleCloseEditModal}
          />
        );
      })()}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay">
          <div className="bg-bg-modal w-full max-w-md rounded-3xl shadow-xl border border-border-default">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-text-primary">
                  {deleteTransactionIds.length === 1 ? 'Excluir Transação' : 'Excluir Transações'}
                </h3>
                <button onClick={handleCloseDeleteModal} className="p-2 hover:bg-bg-elevated rounded-full transition-colors text-text-muted hover:text-text-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-text-secondary">
                {deleteTransactionIds.length === 1
                  ? 'Tem certeza que deseja excluir esta transação?'
                  : `Tem certeza que deseja excluir as ${deleteTransactionIds.length} transações selecionadas?`}
              </div>
              {deleteTransactionIds.length > 1 && (
                <p className="mt-2 text-text-muted text-sm">
                  Esta ação não pode ser desfeita.
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated text-text-secondary rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-error hover:bg-error-hover text-text-inverse rounded"
                >
                  {deleteTransactionIds.length === 1 ? 'Excluir' : 'Excluir Todas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
