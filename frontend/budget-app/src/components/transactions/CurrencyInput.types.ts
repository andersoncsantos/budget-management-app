export interface CurrencyInputProps {
  /** Numeric string formatted with a dot decimal (e.g. "1234.56"). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  label?: string;
}
