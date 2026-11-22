export const parseBRL = (value: string): number => {
  if (!value) return 0;

  // Remove "R$ " prefix and whitespace, remove thousands separator (.),
  // and replace decimal comma (,) with a dot (.)
  const sanitized = value
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const numericValue = parseFloat(sanitized);
  return isNaN(numericValue) ? 0 : numericValue;
};

export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
