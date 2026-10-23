import type { ExpenseViewPreferences, SavedExpenseView } from '../types/expensePeriod';

export type ExpenseViewChange =
  | { action: 'lastView'; view: NonNullable<ExpenseViewPreferences['lastView']> }
  | { action: 'upsert'; view: SavedExpenseView }
  | { action: 'remove'; id: string };
export const emptyExpenseViews = (): ExpenseViewPreferences => ({ version: 1, savedFilters: [] });
const validView = (value: ExpenseViewPreferences['lastView']): boolean => {
  if (!value || typeof value !== 'object' || !value.filters || !value.period) return false;
  const { filters, period } = value;
  return typeof filters.query === 'string' && filters.query.length <= 200 && typeof filters.category === 'string' && filters.category.length <= 100 &&
    ['all', 'cash', 'bank', 'credit_card', 'e_wallet'].includes(filters.paymentMethod) &&
    ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'].includes(filters.sort) &&
    (!filters.tagId || typeof filters.tagId === 'string' && filters.tagId.length <= 100) &&
    (!filters.accountKey || typeof filters.accountKey === 'string' && filters.accountKey.length <= 200) &&
    ['all', 'day', 'month', 'year', 'range'].includes(period.mode) && /^\d{4}-\d{2}-\d{2}$/.test(period.anchorDate) &&
    (period.mode !== 'range' || !!period.startDate && !!period.endDate && /^\d{4}-\d{2}-\d{2}$/.test(period.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(period.endDate) && period.startDate <= period.endDate);
};
export const readExpenseViews = (value?: ExpenseViewPreferences): ExpenseViewPreferences => {
  if (!value || value.version !== 1 || !Array.isArray(value.savedFilters)) return emptyExpenseViews();
  return { version: 1, ...(validView(value.lastView) ? { lastView: value.lastView } : {}),
    savedFilters: value.savedFilters.filter((view) => validView(view) && typeof view.id === 'string' && !!view.id && view.id.length <= 100 && typeof view.name === 'string' && !!view.name.trim() && view.name.length <= 60).slice(0, 20) };
};
/** Merge one intent into the latest snapshot without replacing another device's presets. */
export const applyExpenseViewChange = (previous: ExpenseViewPreferences | undefined, change: ExpenseViewChange): ExpenseViewPreferences => {
  const next = readExpenseViews(previous);
  if (change.action === 'remove') return { ...next, savedFilters: next.savedFilters.filter((view) => view.id !== change.id) };
  if (!validView(change.view)) throw Object.assign(new Error('Invalid expense view'), { code: 'invalid-argument' });
  if (change.action === 'lastView') return { ...next, lastView: change.view };
  const view = change.view;
  if (typeof view.id !== 'string' || !view.id || view.id.length > 100 || !view.name?.trim() || view.name.length > 60) throw Object.assign(new Error('Invalid saved view'), { code: 'invalid-argument' });
  const savedFilters = [...next.savedFilters.filter((item) => item.id !== view.id), view];
  if (savedFilters.length > 20 || JSON.stringify(savedFilters).length > 30_000) throw Object.assign(new Error('Too many saved views'), { code: 'invalid-argument' });
  return { ...next, savedFilters };
};
