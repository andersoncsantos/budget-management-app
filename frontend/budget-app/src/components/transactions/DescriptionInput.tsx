import { useEffect, useRef, useId } from 'react';
import { FileText } from 'lucide-react';
import { DESCRIPTION_MAX, type DescriptionInputProps } from './DescriptionInput.types';

export const DescriptionInput = ({
  value,
  onChange,
  error,
  placeholder = 'Detalhes da transação…',
  label = 'Descrição',
  helperText,
}: DescriptionInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const remaining = DESCRIPTION_MAX - value.length;
  const nearLimit = remaining <= 15;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-text-secondary flex items-center gap-2 ml-1"
      >
        <FileText className="w-4 h-4 text-text-muted" aria-hidden="true" />
        {label}
      </label>
      <div
        className={`relative rounded-2xl border bg-bg-input transition-all duration-150 ${
          error
            ? 'border-error'
            : 'border-border-default focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/30'
        }`}
      >
        <textarea
          id={id}
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={DESCRIPTION_MAX}
          aria-invalid={!!error}
          aria-describedby={`${id}-help`}
          className="w-full px-4 py-3 bg-transparent outline-none resize-none text-text-primary placeholder:text-text-placeholder leading-relaxed rounded-2xl"
        />
        <div className="flex items-center justify-end px-3 pb-2">
          <span
            className={`text-xs font-medium tabular-nums transition-colors ${
              nearLimit ? 'text-error' : 'text-text-muted'
            }`}
          >
            {value.length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error font-medium ml-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-help`} className="text-xs text-text-muted ml-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
