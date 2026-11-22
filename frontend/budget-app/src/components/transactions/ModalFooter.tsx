import { Save, Check } from 'lucide-react';
import { useState } from 'react';

interface ModalFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  cancelLabel: string;
  justSucceeded?: boolean;
}

const SUCCESS_WINDOW_MS = 900;

export const ModalFooter = ({
  onCancel,
  onSubmit,
  isSubmitting,
  submitLabel,
  cancelLabel,
  justSucceeded = false,
}: ModalFooterProps) => {
  const [showSuccess, setShowSuccess] = useState(false);

  if (justSucceeded && !showSuccess) {
    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), SUCCESS_WINDOW_MS);
  }

  const disabled = isSubmitting || showSuccess;

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 px-6 py-4 sm:py-5 bg-bg-surface border-t border-border-default sticky bottom-0 z-10 rounded-b-2xl">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="flex-1 py-3.5 px-5 bg-bg-card hover:bg-bg-elevated active:scale-[0.98] disabled:opacity-60 text-text-secondary font-semibold rounded-xl border border-border-default transition-all duration-150 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        onClick={onSubmit}
        disabled={disabled}
        className={`flex-1 py-3.5 px-5 font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          showSuccess
            ? 'bg-success text-text-inverse focus-visible:ring-success'
            : 'bg-primary hover:bg-primary-hover focus-visible:ring-focus-ring text-text-inverse disabled:bg-text-disabled disabled:text-text-muted disabled:shadow-none'
        }`}
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin"
            />
            <span className="sr-only">Salvando…</span>
          </>
        ) : showSuccess ? (
          <>
            <Check className="w-5 h-5" aria-hidden="true" />
            {submitLabel}
          </>
        ) : (
          <>
            <Save className="w-5 h-5" aria-hidden="true" />
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
};
