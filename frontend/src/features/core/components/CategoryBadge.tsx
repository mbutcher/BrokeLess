import { cn } from '@lib/utils';
import type { Category } from '../types';

interface CategoryBadgeProps {
  category: Category | null | undefined;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  if (!category) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500', className)}>
        Uncategorized
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{
        backgroundColor: category.color ? `${category.color}20` : '#f3f4f6',
        color: category.color ?? '#6b7280',
      }}
    >
      {category.name}
    </span>
  );
}
