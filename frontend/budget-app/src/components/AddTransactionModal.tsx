import { useEffect } from 'react';
import { ModalHeader } from './transactions/ModalHeader';
import { TransactionForm } from './TransactionForm';
import './AddTransactionModal.css';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTransactionModal = ({ isOpen, onClose }: AddTransactionModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-subtitle"
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-bg-overlay overflow-y-auto"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="add-transaction-modal relative w-full sm:max-w-[560px] bg-bg-modal sm:rounded-2xl rounded-none shadow-xl border border-border-default overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[92vh]"
      >
        <ModalHeader
          title="Adicionar Transação"
          subtitle="Registre uma nova despesa ou receita."
          onClose={onClose}
        />

        <TransactionForm
          key={isOpen ? 'open' : 'closed'}
          onClose={onClose}
          onSuccess={() => {
            window.setTimeout(onClose, 700);
          }}
        />
      </div>
    </div>
  );
};

export default AddTransactionModal;
