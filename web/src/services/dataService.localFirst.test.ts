import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { dataService } from './dataService';
import { sessionCache } from '../utils/sessionCache';
import { offlineQueue } from '../utils/offlineQueue';
import { writeLocalFirst } from '../utils/localFirstMutation';

vi.mock('../utils/networkStatus', () => ({ networkStatus: { isOnline: true } }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); });
afterEach(() => vi.restoreAllMocks());

describe('data reads concurrent with local writes', () => {
  it('does not let a background snapshot erase an in-flight local create', async () => {
    sessionCache.set('incomes', 'user', []);
    let finishRead!: (rows: unknown[]) => void;
    const onUpdate = vi.fn();
    await dataService.getDataWithRevalidate('incomes', 'user', () => new Promise<unknown[]>((resolve) => { finishRead = resolve; }), onUpdate);
    let finishWrite!: () => void;
    const pending = writeLocalFirst({ type: 'create', entity: 'income', payload: { id: 'local', userId: 'user', amount: 20 } },
      () => new Promise<void>((resolve) => { finishWrite = resolve; }));
    finishRead([]);
    await Promise.resolve();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(sessionCache.get('incomes', 'user')).toEqual([expect.objectContaining({ id: 'local' })]);
    finishWrite();
    await pending;
  });

  it('preserves the latest cache even when the local write completes before an older forced read', async () => {
    let finishRead!: (rows: unknown[]) => void;
    const pendingRead = dataService.getData('banks', 'user', true, () => new Promise<unknown[]>((resolve) => { finishRead = resolve; }));
    await writeLocalFirst({ type: 'create', entity: 'bank', payload: { id: 'bank', userId: 'user', balance: 100 } }, async () => 'bank');
    expect(offlineQueue.count()).toBe(0);
    finishRead([]);
    expect(await pendingRead).toEqual([expect.objectContaining({ id: 'bank', balance: 100 })]);
  });

  it('detects category content and sort changes even without updatedAt timestamps', () => {
    expect(dataService.areDataEqual([{ id: 'a', name: 'Old' }], [{ id: 'a', name: 'New' }])).toBe(false);
    expect(dataService.areDataEqual([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).toBe(false);
  });

  it('also protects a local edit before its serialized Firebase operation starts', async () => {
    sessionCache.set('incomes', 'user', [{ id: 'income', amount: 10 }]);
    let finishRead!: (rows: { id: string; amount: number }[]) => void;
    const onUpdate = vi.fn();
    await dataService.getDataWithRevalidate('incomes', 'user',
      () => new Promise<{ id: string; amount: number }[]>((resolve) => { finishRead = resolve; }), onUpdate);
    dataService.updateCache<{ id: string; amount: number }[]>('incomes', 'user', (rows) => rows.map((row) => ({ ...row, amount: 20 })));
    finishRead([{ id: 'income', amount: 10 }]);
    await Promise.resolve();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(sessionCache.get('incomes', 'user')).toEqual([{ id: 'income', amount: 20 }]);
  });
});
