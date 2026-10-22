import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedHistoryCovers, getHistoryPage, readHistoryRange } from './historyService';
import { readExpenseAggregate, summarizeCompleteExpensePeriod } from './expenseAggregateService';
import { readCompleteExpensePeriod, expensePeriodReadKey } from './expensePeriodReadService';
import { sessionCache } from '../utils/sessionCache';
import { offlineQueue } from '../utils/offlineQueue';
import type { Expense } from '../types';
import { convertAmountToCurrency } from './currencyRateService';
const mode = vi.hoisted(() => ({ isOnline: false }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: mode }));
vi.mock('./currencyRateService', () => ({ convertAmountToCurrency: vi.fn(async (amount: number) => amount) }));
const range = { startDate: '2026-10-01', endDate: '2026-10-31' };
const makeRows = () => Array.from({ length: 205 }, (_, index) => ({ id: `row-${String(index).padStart(3, '0')}`, userId: 'user', amount: 1, category: 'Food', date: '2026-10-18' } as Expense));
beforeEach(async () => { mode.isOnline = false; vi.mocked(convertAmountToCurrency).mockImplementation(async (amount) => amount); sessionCache.clearAll(); await offlineQueue.clear(); });
describe('offline exact summaries and cached navigation', () => {
  it('does not publish the shared summary if the snapshot changes during its final conversion batch', async () => {
    sessionCache.set('expenses', 'user', makeRows().slice(0, 5), { coverage: 'all' });
    const period = await readCompleteExpensePeriod('user');
    let converted = 0;
    vi.mocked(convertAmountToCurrency).mockImplementation(async (amount) => {
      if (++converted === 5) sessionCache.set('expenses', 'user', [], { coverage: 'all' });
      return amount;
    });
    await expect(summarizeCompleteExpensePeriod('user', period.rows, 'MYR', undefined, (rows) => rows,
      () => expensePeriodReadKey('user') === period.key)).rejects.toMatchObject({ code: 'stale-read' });
  });
  it('shows exact covered-period totals including pending mutations without a server read', async () => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'dashboard:2026-01-01:2027-01-31' });
    await offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: { id: 'row-000', userId: 'user', amount: 5 } });
    await offlineQueue.enqueue({ type: 'delete', entity: 'expense', payload: { id: 'row-001', userId: 'user' } });
    await offlineQueue.enqueue({ type: 'create', entity: 'expense', payload: { id: 'new', userId: 'user', amount: 7, category: 'Food', date: '2026-10-18' } });
    expect(cachedHistoryCovers('expenses', 'user', range)).toBe(true);
    const result = await readExpenseAggregate('user', 'MYR', range, (rows) => rows, () => true);
    expect(result.count).toBe(205); expect(result.total).toBe(215);
  });
  it('navigates all complete cached history in bounded non-overlapping pages', async () => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'all' });
    const first = await getHistoryPage<Expense>('expenses', 'user');
    const second = await getHistoryPage<Expense>('expenses', 'user', undefined, first.cursor);
    const third = await getHistoryPage<Expense>('expenses', 'user', undefined, second.cursor);
    expect([first.rows.length, second.rows.length, third.rows.length]).toEqual([100, 100, 5]);
    expect(new Set([...first.rows, ...second.rows, ...third.rows].map((row) => row.id)).size).toBe(205);
    expect(third.hasMore).toBe(false); expect(first.cached).toBe(true); expect(first.complete).toBe(true);
  });
  it('allows saved rows but never declares incomplete history or totals exact', async () => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'dashboard:2026-01-01:2027-01-31' });
    expect((await getHistoryPage('expenses', 'user')).complete).toBe(false);
    await expect(readHistoryRange('expenses', 'user')).rejects.toMatchObject({ code: 'incomplete-cache' });
    await expect(readExpenseAggregate('user', 'MYR', undefined, (rows) => rows, () => true)).rejects.toMatchObject({ code: 'incomplete-cache' });
    await expect(readExpenseAggregate('user', 'MYR', { startDate: '2025-01-01', endDate: '2025-01-31' }, (rows) => rows, () => true)).rejects.toMatchObject({ code: 'incomplete-cache' });
  });
  it.each(['all', 'dashboard:2026-10-01:2026-10-31'])('rejects aggregate pages when a full snapshot changes to %s after the first page', async (coverage) => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'all' });
    let conversions = 0;
    vi.mocked(convertAmountToCurrency).mockImplementation(async (amount) => {
      if (++conversions === 100) sessionCache.set('expenses', 'user', makeRows().slice(0, 10), { coverage });
      return amount;
    });
    await expect(readExpenseAggregate('user', 'MYR', undefined, (rows) => rows, () => true)).rejects.toMatchObject({ code: coverage === 'all' ? 'stale-read' : 'incomplete-cache' });
  });
  it('rejects full-history traversal if its snapshot is narrowed between pages', async () => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'all' });
    const progress = vi.fn(() => { sessionCache.set('expenses', 'user', makeRows().slice(0, 10), { coverage: 'dashboard:2026-10-01:2026-10-31' }); });
    await expect(readHistoryRange('expenses', 'user', undefined, progress)).rejects.toMatchObject({ code: 'stale-read' });
    expect(progress).toHaveBeenCalledTimes(1);
  });
  it('also detects snapshot replacement during the final page before publishing a total', async () => {
    sessionCache.set('expenses', 'user', makeRows().slice(0, 5), { coverage: 'all' });
    let conversions = 0;
    vi.mocked(convertAmountToCurrency).mockImplementation(async (amount) => {
      if (++conversions === 5) sessionCache.set('expenses', 'user', [], { coverage: 'all' });
      return amount;
    });
    await expect(readExpenseAggregate('user', 'MYR', undefined, (rows) => rows, () => true)).rejects.toMatchObject({ code: 'stale-read' });
  });
  it('keeps its original cache source when connectivity changes during traversal', async () => {
    sessionCache.set('expenses', 'user', makeRows(), { coverage: 'all' });
    let conversions = 0;
    vi.mocked(convertAmountToCurrency).mockImplementation(async (amount) => { if (++conversions === 100) mode.isOnline = true; return amount; });
    const result = await readExpenseAggregate('user', 'MYR', undefined, (rows) => rows, () => true);
    expect(result.count).toBe(205); expect(result.total).toBe(205);
  });
});
