export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
  hover: string;
  colorLight: string;
  colorDark: string;
}

const CUSTOM_CATEGORIES: Record<string, CategoryStyle> = {
  'Cartão de Crédito': {
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-black',
    hover: 'hover:bg-zinc-800',
    colorLight: '#18181B',
    colorDark: '#A1A1AA',
  },
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Receita: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-200',
    colorLight: '#10B981',
    colorDark: '#34D399',
  },
  Alimentação: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-200',
    colorLight: '#F59E0B',
    colorDark: '#FBBF24',
  },
  Contas: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-200',
    colorLight: '#3B82F6',
    colorDark: '#60A5FA',
  },
  'Contas (Casa Erm.)': {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-200',
    colorLight: '#6366F1',
    colorDark: '#818CF8',
  },
  'Gastos Extras': {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-200',
    colorLight: '#F97316',
    colorDark: '#FB923C',
  },
  Transporte: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hover: 'hover:bg-sky-200',
    colorLight: '#06B6D4',
    colorDark: '#22D3EE',
  },
  Carro: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hover: 'hover:bg-sky-200',
    colorLight: '#0284C7',
    colorDark: '#38BDF8',
  },
  Saúde: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-200',
    colorLight: '#EF4444',
    colorDark: '#F87171',
  },
  Farmácia: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    hover: 'hover:bg-red-200',
    colorLight: '#E11D48',
    colorDark: '#FB7185',
  },
  Educação: {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-200',
    hover: 'hover:bg-violet-200',
    colorLight: '#8B5CF6',
    colorDark: '#A78BFA',
  },
  Moradia: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-200',
    colorLight: '#6366F1',
    colorDark: '#818CF8',
  },
  'Tom Penha': {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-200',
    colorLight: '#0D9488',
    colorDark: '#2DD4BF',
  },
  Compras: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-200',
    colorLight: '#9333EA',
    colorDark: '#C084FC',
  },
  Investimentos: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-200',
    colorLight: '#14B8A6',
    colorDark: '#2DD4BF',
  },
  Lazer: {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-200',
    colorLight: '#EC4899',
    colorDark: '#F472B6',
  },
  Diversão: {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-200',
    colorLight: '#DB2777',
    colorDark: '#F472B6',
  },
  'Tarifas Bancárias': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-200',
    colorLight: '#CA8A04',
    colorDark: '#FACC15',
  },
};

const FALLBACK_PALETTE: CategoryStyle[] = [
  {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-200',
    colorLight: '#2563EB',
    colorDark: '#60A5FA',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-200',
    colorLight: '#7C3AED',
    colorDark: '#A78BFA',
  },
  {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-200',
    colorLight: '#DB2777',
    colorDark: '#F472B6',
  },
  {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-200',
    colorLight: '#0D9488',
    colorDark: '#2DD4BF',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-200',
    colorLight: '#D97706',
    colorDark: '#FBBF24',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-200',
    colorLight: '#4F46E5',
    colorDark: '#818CF8',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-200',
    colorLight: '#E11D48',
    colorDark: '#FB7185',
  },
  {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-200',
    colorLight: '#0891B2',
    colorDark: '#22D3EE',
  },
];

const UNKNOWN_STYLE: CategoryStyle = {
  bg: 'bg-slate-100',
  text: 'text-slate-700',
  border: 'border-slate-200',
  hover: 'hover:bg-slate-200',
  colorLight: '#64748B',
  colorDark: '#94A3B8',
};

const ALL_STYLES: Record<string, CategoryStyle> = { ...CUSTOM_CATEGORIES, ...CATEGORY_STYLES };

function normalizeCategoryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Pre-calculate a normalized map for case-insensitive and accent-insensitive lookup
const NORMALIZED_STYLES: Record<string, CategoryStyle> = Object.entries(ALL_STYLES).reduce(
  (acc, [key, style]) => {
    acc[key.toLowerCase()] = style;
    acc[normalizeCategoryKey(key)] = style;
    return acc;
  },
  {} as Record<string, CategoryStyle>
);

export function getCategoryStyle(categoria: string): CategoryStyle {
  if (!categoria) return UNKNOWN_STYLE;
  const trimmed = categoria.trim();
  if (!trimmed) return UNKNOWN_STYLE;

  const exactOrNormalized =
    NORMALIZED_STYLES[trimmed.toLowerCase()] ?? NORMALIZED_STYLES[normalizeCategoryKey(trimmed)];
  if (exactOrNormalized) {
    return exactOrNormalized;
  }

  let hash = 0;
  const normalized = normalizeCategoryKey(trimmed);
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export const CATEGORY_NAMES = Object.keys(ALL_STYLES);
