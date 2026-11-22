import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onAddNew?: (value: string) => void;
  options: string[];
  placeholder: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  clearable?: boolean;
  optional?: boolean;
}

export const Combobox = ({
  value,
  onChange,
  onAddNew,
  options,
  placeholder,
  label,
  icon,
  error,
  isLoading,
  emptyMessage,
  searchPlaceholder,
  clearable = false,
  optional = false,
}: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevFilteredLen, setPrevFilteredLen] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionIdPrefix = useId();

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const needle = search.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(needle));
  }, [options, search]);

  const showCreateOption =
    !!onAddNew &&
    search.trim().length > 0 &&
    !options.some((opt) => opt.toLowerCase() === search.trim().toLowerCase());

  const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);

  if (prevSearch !== search || prevFilteredLen !== filteredOptions.length) {
    setPrevSearch(search);
    setPrevFilteredLen(filteredOptions.length);
    if (highlightedIndex !== -1) setHighlightedIndex(-1);
  }

  const reset = () => {
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        reset();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const id = window.requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-combobox-index="${highlightedIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        reset();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    reset();
    triggerRef.current?.focus();
  };

  const handleCreateNew = () => {
    const trimmed = search.trim();
    if (trimmed && onAddNew) {
      onAddNew(trimmed);
      onChange(trimmed);
    }
    reset();
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(totalItems - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (highlightedIndex === filteredOptions.length && showCreateOption) {
          handleCreateNew();
        } else if (showCreateOption) {
          handleCreateNew();
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Tab':
        reset();
        break;
    }
  };

  const triggerClass = [
    'w-full px-4 py-3 rounded-xl border bg-bg-input text-left outline-none transition-all duration-150',
    'flex items-center justify-between gap-2',
    'focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring',
    'hover:border-border-hover',
    error ? 'border-error bg-bg-error' : 'border-border-default',
  ].join(' ');

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label
        htmlFor={`${optionIdPrefix}-trigger`}
        className="text-sm font-semibold text-text-secondary flex items-center gap-2 ml-1"
      >
        {icon}
        <span>{label}</span>
        {optional && (
          <span className="text-xs font-normal text-text-muted">(opcional)</span>
        )}
      </label>

      <div className="relative">
        <button
          id={`${optionIdPrefix}-trigger`}
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={!!error}
          aria-controls={`${optionIdPrefix}-listbox`}
          className={triggerClass}
        >
          <span className={`truncate ${!value ? 'text-text-placeholder' : 'text-text-secondary font-medium'}`}>
            {value || placeholder}
          </span>
          <span className="flex items-center gap-1">
            {clearable && value && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Limpar seleção"
                onClick={handleClear}
                className="p-1 rounded-md hover:bg-border-hover text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}
            <ChevronDown
              className={`w-5 h-5 text-text-muted transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {isOpen && (
          <div
            id={`${optionIdPrefix}-listbox`}
            role="listbox"
            aria-label={label}
            className="absolute z-50 w-full mt-2 bg-bg-elevated border border-border-default rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border-default bg-bg-surface">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder ?? `Pesquisar ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={`Pesquisar ${label.toLowerCase()}`}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-border-default rounded-lg focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring outline-none transition-all bg-bg-input text-text-secondary placeholder:text-text-placeholder"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => {
                      setSearch('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-border-hover rounded-md transition-colors text-text-muted"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
              {isLoading ? (
                <div className="p-4 text-sm text-text-muted text-center">Carregando...</div>
              ) : filteredOptions.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredOptions.map((opt, index) => {
                    const isSelected = opt === value;
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-combobox-index={index}
                        id={`${optionIdPrefix}-option-${index}`}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-primary-light text-primary'
                            : 'hover:bg-bg-surface text-text-secondary'
                        } ${isSelected ? 'font-semibold' : ''}`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && (
                          <span aria-hidden="true" className="text-primary">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : !showCreateOption ? (
                <div className="p-4 text-sm text-text-muted text-center">
                  {emptyMessage ?? 'Nenhum resultado encontrado'}
                </div>
              ) : null}

              {showCreateOption && (
                <button
                  type="button"
                  data-combobox-index={filteredOptions.length}
                  onClick={handleCreateNew}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                  className={`w-full mt-1 px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${
                    highlightedIndex === filteredOptions.length
                      ? 'bg-primary-light text-primary'
                      : 'hover:bg-primary-light text-primary'
                  } ${filteredOptions.length > 0 ? 'pt-2 border-t border-border-default' : ''}`}
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Criar &ldquo;<span className="font-medium">{search.trim()}</span>&rdquo;
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error font-medium ml-1">
          {error}
        </p>
      )}
    </div>
  );
};
