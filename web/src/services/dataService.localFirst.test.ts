import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { dataService } from './dataService';
import { sessionCache } from '../utils/sessionCache';
import { offlineQueue } from '../utils/offlineQueue';
import { writeLocalFirst } from '../utils/localFirstMutation';
vi.mock('../utils/networkStatus', () => ({ networkStatus: { isOnline: true } }));
beforeEach(async () => { sessionCache.clearAll(); await offlineQueue.clear(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); });
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
  it('compares content, ordering and normalized dates without serializing the dataset', () => {
    expect(dataService.areDataEqual([{ id: 'a', name: 'Old' }], [{ id: 'a', name: 'New' }])).toBe(false);
    expect(dataService.areDataEqual([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).toBe(false);
    expect(dataService.areDataEqual([{ createdAt: new Date('2026-01-01') }], [{ createdAt: '2026-01-01T00:00:00.000Z' }])).toBe(true);
  });
});
