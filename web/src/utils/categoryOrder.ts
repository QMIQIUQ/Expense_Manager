import { Category } from '../types';

export const sortCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => {
    const aHasOrder = Number.isFinite(a.order);
    const bHasOrder = Number.isFinite(b.order);
    if (aHasOrder && bHasOrder && a.order !== b.order) return a.order! - b.order!;
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
    return a.name.localeCompare(b.name) || (a.id || '').localeCompare(b.id || '');
  });
