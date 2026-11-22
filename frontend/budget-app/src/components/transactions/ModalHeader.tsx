import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const ModalHeader = ({ title, subtitle, onClose }: ModalHeaderProps) => {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-border-default bg-bg-modal/80 backdrop-blur-sm sticky top-0 z-10 rounded-t-2xl">
      <div className="min-w-0">
        <h2 id="modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p id="modal-subtitle" className="mt-1 text-sm text-text-secondary leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar modal"
        className="shrink-0 -m-2 p-2 rounded-full text-text-muted hover:text-text-secondary hover:bg-bg-elevated active:scale-95 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
};
