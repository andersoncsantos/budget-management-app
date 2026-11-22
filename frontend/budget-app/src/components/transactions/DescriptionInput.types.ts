export const DESCRIPTION_MAX = 255;

export interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  helperText?: string;
}
