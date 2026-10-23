import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { dataService } from './dataService';
import { sessionCache } from '../utils/sessionCache';
import { offlineQueue } from '../utils/offlineQueue';
import { writeLocalFirst } from '../utils/localFirstMutation';
import { mergeExpenseRows } from '../utils/pendingOperations';
import type { Expense } from '../types';
const network = vi.hoisted(() => ({ isOnline: true }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: network }));
beforeEach(async () => { network.isOnline = true; sessionCache.clearAll(); await offlineQueue.clear(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); });
afterEach(() => vi.restoreAllMocks());
describe('reads concurrent with durable local writes', () => {
  it('rejects a background snapshot older than a durable local create', async () => {
    sessionCache.set('incomes', 'user', []);
    let finish!: (rows: unknown[]) => void;
    const update = vi.fn();
    await dataService.getDataWithRevalidate('incomes', 'user', () => new Promise<unknown[]>((resolve) => { finish = resolve; }), update);
    await writeLocalFirst({ type: 'create', entity: 'income', payload: { id: 'local', userId: 'user', amount: 20 } }, vi.fn()).catch(() => undefined);
    finish([]); await vi.waitFor(() => expect(sessionCache.get('incomes', 'user')).toEqual([expect.objectContaining({ id: 'local' })]));
    expect(update).not.toHaveBeenCalled();
  });
  it('keeps a newer cache when a forced read arrives late', async () => {
    let finish!: (rows: unknown[]) => void;
    const pending = dataService.getData('banks', 'user', true, () => new Promise<unknown[]>((resolve) => { finish = resolve; }));
    await Promise.resolve();
    await writeLocalFirst({ type: 'create', entity: 'bank', payload: { id: 'bank', userId: 'user', balance: 100 } }, vi.fn()).catch(() => undefined);
    finish([]);
    expect(await pending).toEqual([expect.objectContaining({ id: 'bank', balance: 100 })]);
    expect(offlineQueue.count()).toBe(1);
  });
  it('never republishes stale data if a newer generation has no cache', async () => {
    let finish!: (rows: unknown[]) => void;
    const pending = dataService.getData('banks', 'user', true, () => new Promise<unknown[]>((resolve) => { finish = resolve; }));
    const check = expect(pending).rejects.toMatchObject({ code: 'stale-read' });
    await Promise.resolve();
    dataService.invalidateCache('banks', 'user'); finish([{ id: 'old' }]);
    await check;
    expect(sessionCache.get('banks', 'user')).toBeNull();
  });
  it('shares a fetch only within the same owner, collection, scope and generation', async () => {
    const fetch = vi.fn(async () => [{ id: 'a' }]);
    await Promise.all([dataService.getData('incomes', 'user', true, fetch, undefined, 'all'), dataService.getData('incomes', 'user', true, fetch, undefined, 'all')]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(sessionCache.getCoverage('incomes', 'user')).toBe('all');
    await dataService.getData('incomes', 'other', true, fetch, undefined, 'all');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reports whether a scoped expense read returned verified server data or a cache', async () => {
    const source = vi.fn();
    const fetch = vi.fn(async () => [{ id: 'server-row', userId: 'user' }]);
    await dataService.getData('expenses', 'user', true, fetch, undefined, 'dashboard', source);
    expect(source).toHaveBeenLastCalledWith('server');

    await dataService.getData('expenses', 'user', false, fetch, undefined, 'dashboard', source);
    expect(source).toHaveBeenLastCalledWith('cached');
  });
  it('reports cached provenance for the initial stale-while-revalidate value', async () => {
    sessionCache.set('expenses', 'user', [{ id: 'cached-row', userId: 'user' }], { coverage: 'dashboard' });
    const source = vi.fn();
    const update = vi.fn();
    const fetch = vi.fn(async () => [{ id: 'server-row', userId: 'user' }]);

    const initial = await dataService.getDataWithRevalidate('expenses', 'user', fetch, update, undefined, 'dashboard', source);
    expect(initial).toEqual([{ id: 'cached-row', userId: 'user' }]);
    expect(source).toHaveBeenCalledExactlyOnceWith('cached');
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith([{ id: 'server-row', userId: 'user' }]));
    expect(source).toHaveBeenCalledExactlyOnceWith('cached');
  });
  it('reports server provenance when an initial read has no cache', async () => {
    const source = vi.fn();
    const fetch = vi.fn(async () => [{ id: 'server-row', userId: 'user' }]);

    await expect(dataService.getDataWithRevalidate('expenses', 'user', fetch, undefined, undefined, 'dashboard', source))
      .resolves.toEqual([{ id: 'server-row', userId: 'user' }]);
    expect(source).toHaveBeenCalledExactlyOnceWith('server');
  });
  it.each([
    ['cached-first initialization', true],
    ['offline initialization', false],
  ])('does not re-add a stale tracked expense during %s', async (_case, online) => {
    network.isOnline = online;
    const staleTrackedExpense: Expense = {
      id: 'settled', userId: 'user', description: 'old shared expense', amount: 10, category: 'Food',
      date: '2026-10-01', currency: 'MYR', needsRepaymentTracking: true,
      createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    sessionCache.set('receivableExpenses', 'user', [], { coverage: 'all' });
    sessionCache.set('expenses', 'user', [staleTrackedExpense], { coverage: 'dashboard' });
    const source = vi.fn();
    const initial = await dataService.getDataWithRevalidate('expenses', 'user', async () => [staleTrackedExpense], undefined, undefined, 'dashboard', source);
    const readSource = source.mock.calls[0][0];
    const merged = mergeExpenseRows([], initial, 'user', [], {
      authoritativeReceivableIds: new Set(),
      incomingSource: readSource === 'server' ? 'verified-partial' : 'cached',
    });

    expect(readSource).toBe('cached');
    expect(merged).toEqual([]);
  });
  it('retains an older receivable outside a partial candidate cache while offline', async () => {
    network.isOnline = false;
    const olderReceivable: Expense = {
      id: 'older-receivable', userId: 'user', description: 'valid offline receivable', amount: 10, category: 'Food',
      date: '2026-09-01', currency: 'MYR', needsRepaymentTracking: true,
      createdAt: new Date('2026-09-01T00:00:00.000Z'), updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    const knownHistoryPageReceivable: Expense = {
      id: 'history-page-receivable', userId: 'user', description: 'partial candidate', amount: 20, category: 'Food',
      date: '2026-10-01', currency: 'MYR', needsRepaymentTracking: true,
      createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    sessionCache.set('receivableExpenses', 'user', [knownHistoryPageReceivable], { coverage: 'history-page' });
    sessionCache.set('expenses', 'user', [olderReceivable, knownHistoryPageReceivable], { coverage: 'dashboard' });
    const source = vi.fn();
    const initial = await dataService.getDataWithRevalidate('expenses', 'user', async () => [], undefined, undefined, 'dashboard', source);
    const candidateSnapshot = sessionCache.getSnapshot<Expense[]>('receivableExpenses', 'user');
    const authoritativeReceivableIds = candidateSnapshot?.coverage === 'all'
      ? new Set(candidateSnapshot.data.map((row) => row.id!))
      : undefined;
    const merged = mergeExpenseRows([], initial, 'user', [], { authoritativeReceivableIds, incomingSource: 'cached' });

    expect(source).toHaveBeenCalledExactlyOnceWith('cached');
    expect(candidateSnapshot?.coverage).toBe('history-page');
    expect(merged.map(({ id }) => id).sort()).toEqual(['history-page-receivable', 'older-receivable']);
  });
  it('compares content, ordering and normalized dates without serializing the dataset', () => {
    expect(dataService.areDataEqual([{ id: 'a', name: 'Old' }], [{ id: 'a', name: 'New' }])).toBe(false);
    expect(dataService.areDataEqual([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).toBe(false);
    expect(dataService.areDataEqual([{ createdAt: new Date('2026-01-01') }], [{ createdAt: '2026-01-01T00:00:00.000Z' }])).toBe(true);
  });
});
