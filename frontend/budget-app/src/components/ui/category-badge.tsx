import { getCategoryStyle } from '../../lib/category-styles';

interface CategoryBadgeProps {
  categoria: string;
}

export const CategoryBadge = ({ categoria }: CategoryBadgeProps) => {
  const style = getCategoryStyle(categoria);

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-md border
        whitespace-nowrap transition-colors
        ${style.bg} ${style.text} ${style.border} ${style.hover}
      `}
    >
      {categoria}
    </span>
  );
};
