export interface DatePickerInputProps {
  /** ISO date in `YYYY-MM-DD` format (already locale-neutral). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  helperText?: string;
}
