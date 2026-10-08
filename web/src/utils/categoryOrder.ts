import type { Category, Expense } from '../types';

export const sortCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => {
    const aHasOrder = Number.isFinite(a.order);
    const bHasOrder = Number.isFinite(b.order);
    if (aHasOrder && bHasOrder && a.order !== b.order) return a.order! - b.order!;
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
    return a.name.localeCompare(b.name) || (a.id || '').localeCompare(b.id || '');
  });

export const sortCategoryEntries = <T>(entries: [string, T][], categories: Category[]): [string, T][] => {
  const positions = new Map<string, number>();
  sortCategories(categories).forEach((category, index) => {
    if (!positions.has(category.name)) positions.set(category.name, index);
  });

  return [...entries].sort(([a], [b]) => {
    const aPosition = positions.get(a);
    const bPosition = positions.get(b);
    if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition;
    if (aPosition !== undefined) return -1;
    if (bPosition !== undefined) return 1;
    return a.localeCompare(b);
  });
};

export const getRecentlyUsedCategories = (categories: Category[], expenses: Expense[], limit = 5): Category[] => {
  const ordered = sortCategories(categories);
  const lastUsed = new Map<string, number>();

  expenses.forEach((expense) => {
    if (!expense.category) return;
    const createdAt = expense.createdAt ? new Date(String(expense.createdAt)).getTime() : NaN;
    const usedAt = Number.isFinite(createdAt) ? createdAt : new Date(`${expense.date}T00:00:00`).getTime();
    if (Number.isFinite(usedAt) && usedAt > (lastUsed.get(expense.category) ?? -Infinity)) {
      lastUsed.set(expense.category, usedAt);
    }
  });

  const positions = new Map(ordered.map((category, index) => [category.id || category.name, index]));
  return ordered
    .filter((category) => lastUsed.has(category.name))
    .sort((a, b) =>
      (lastUsed.get(b.name) ?? 0) - (lastUsed.get(a.name) ?? 0) ||
      (positions.get(a.id || a.name) ?? 0) - (positions.get(b.id || b.name) ?? 0),
    )
    .slice(0, limit);
};
