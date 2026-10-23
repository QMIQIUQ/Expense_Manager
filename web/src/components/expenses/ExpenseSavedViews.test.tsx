import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test/test-utils';
import { ExpenseSavedViews } from './ExpenseSavedViews';
import { DEFAULT_EXPENSE_FILTERS } from '../../types/expensePeriod';
const fake = vi.hoisted(() => ({ preferences: {} as unknown, save: vi.fn() }));
vi.mock('../../hooks/useExpenseViews', () => ({ useExpenseViews: () => ({ preferences: fake.preferences, ready: true, save: fake.save }) }));
const base = { filters: DEFAULT_EXPENSE_FILTERS, period: { mode: 'month' as const, anchorDate: '2026-08-15' } };
beforeEach(() => { fake.save.mockReset().mockResolvedValue(undefined); });
describe('saved view application', () => {
  it.each(['day', 'month', 'year', 'range'] as const)('restores the exact saved %s selection', (mode) => {
    const period = { mode, anchorDate: '2026-08-15', ...(mode === 'range' ? { startDate: '2026-08-01', endDate: '2026-08-15' } : {}) };
    fake.preferences = { version: 1, savedFilters: [{ ...base, period, id: 'trip', name: 'August trip' }] };
    const apply = vi.fn(); render(<ExpenseSavedViews userId="one" {...base} onApply={apply} />);
    fireEvent.click(screen.getByText('Saved views')); fireEvent.click(screen.getByText('August trip'));
    expect(apply).toHaveBeenLastCalledWith({ filters: base.filters, period });
  });
  it('restores a last view once for the current owner', () => {
    fake.preferences = { version: 1, savedFilters: [], lastView: base };
    const apply = vi.fn(); render(<ExpenseSavedViews userId="one" {...base} onApply={apply} />);
    expect(apply).toHaveBeenCalledExactlyOnceWith(base);
  });
});
