import { describe, expect, it } from 'vitest';
import { applyExpenseViewChange, readExpenseViews } from './expenseViewPreferences';
import { DEFAULT_EXPENSE_FILTERS, type ExpenseViewPreferences, type SavedExpenseView } from '../types/expensePeriod';
const view = { filters: { ...DEFAULT_EXPENSE_FILTERS, tagId: 'trip', accountKey: 'bank:one' }, period: { mode: 'month' as const, anchorDate: '2026-10-23' } };
const preset: SavedExpenseView = { ...view, id: 'stable-preset', name: 'Travel' };
describe('cross-device view commands', () => {
  it('merges independent preset and last-view intents without lost presets', () => {
    const first = applyExpenseViewChange(undefined, { action: 'upsert', view: preset });
    const second = applyExpenseViewChange(first, { action: 'lastView', view });
    const third = applyExpenseViewChange(second, { action: 'upsert', view: { ...preset, id: 'second', name: 'Work' } });
    expect(third.savedFilters.map((item) => item.id)).toEqual(['stable-preset', 'second']);
    expect(third.lastView).toEqual(view);
    expect(applyExpenseViewChange(third, { action: 'remove', id: 'stable-preset' }).savedFilters.map((item) => item.id)).toEqual(['second']);
  });
  it('bounds settings and falls back safely for legacy or malformed views', () => {
    expect(readExpenseViews(undefined)).toEqual({ version: 1, savedFilters: [] });
    expect(readExpenseViews({ version: 9, savedFilters: [] } as unknown as ExpenseViewPreferences)).toEqual({ version: 1, savedFilters: [] });
    expect(() => applyExpenseViewChange(undefined, { action: 'upsert', view: { ...preset, filters: { ...view.filters, query: 'a'.repeat(201) } } })).toThrow();
    const previous = { version: 1 as const, savedFilters: Array.from({ length: 20 }, (_, index) => ({ ...preset, id: `p-${index}` })) };
    expect(() => applyExpenseViewChange(previous, { action: 'upsert', view: preset })).toThrow('Too many');
  });
});
