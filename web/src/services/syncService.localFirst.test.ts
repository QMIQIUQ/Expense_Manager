import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncService } from './syncService';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import { incomeService } from './incomeService';
import { expenseService } from './expenseService';
import { scheduledPaymentService } from './scheduledPaymentService';
import { commitQueuedEntity } from './queuedEntityMutation';
vi.mock('../config/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'user' } } }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: { isOnline: true, subscribe: vi.fn() } }));
vi.mock('./queuedEntityMutation', () => ({ commitQueuedEntity: vi.fn() }));
vi.mock('./expenseService', () => ({ expenseService: { create: vi.fn(), update: vi.fn(), deleteWithRelatedTransfers: vi.fn() } }));
vi.mock('./incomeService', () => ({ incomeService: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('./scheduledPaymentService', () => ({ scheduledPaymentService: { createPaymentRecord: vi.fn(), updatePaymentRecord: vi.fn(), deletePaymentRecord: vi.fn() } }));
beforeEach(async () => {
  syncService.setAutoSync(false);
  await offlineQueue.clear(); sessionCache.clearAll();
  vi.clearAllMocks();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());
const create = (id: string, entity: 'income' | 'bank' | 'expense' = 'income', extra = {}) => ({
  type: 'create' as const, entity, payload: { id, userId: 'user', ...extra },
});
describe('leased background replay', () => {
  it.each(['category', 'recurring', 'scheduledPayment', 'card', 'bank', 'ewallet', 'repayment', 'quickExpensePreset'] as const)('replays %s through the receipt transaction dispatcher', async (entity) => {
    await offlineQueue.enqueue({ ...create('doc'), entity });
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 1, failed: 0 });
    expect(commitQueuedEntity).toHaveBeenCalledOnce();
    expect(offlineQueue.count()).toBe(0);
  });
  it.each(['create', 'update', 'delete'] as const)('uses linked scheduled payment %s lifecycle', async (type) => {
    await offlineQueue.enqueue({ type, entity: 'scheduledPaymentRecord', payload: { id: 'record', userId: 'user' } });
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 1, failed: 0 });
    const target = type === 'create' ? scheduledPaymentService.createPaymentRecord : type === 'update' ? scheduledPaymentService.updatePaymentRecord : scheduledPaymentService.deletePaymentRecord;
    expect(target).toHaveBeenCalledOnce();
    expect(commitQueuedEntity).not.toHaveBeenCalled();
  });
  it('does not run later update/delete ahead of a failed create or before its deadline', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(incomeService.create).mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'unavailable' }));
    for (const type of ['create', 'update', 'delete'] as const) await offlineQueue.enqueue({ ...create('income'), type });
    await syncService.syncOfflineQueue();
    expect(incomeService.update).not.toHaveBeenCalled();
    expect(incomeService.delete).not.toHaveBeenCalled();
    expect(offlineQueue.getAll().map((row) => row.retryCount)).toEqual([1, 0, 0]);
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 0, failed: 0 });
    await offlineQueue.retry(offlineQueue.getAll()[0].id);
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 3, failed: 0 });
    expect(incomeService.update).toHaveBeenCalledOnce();
    expect(incomeService.delete).toHaveBeenCalledOnce();
  });
  it('keeps unrelated work progressing while a dependency needs attention', async () => {
    vi.mocked(commitQueuedEntity).mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    await offlineQueue.enqueue(create('bank', 'bank'));
    await offlineQueue.enqueue(create('expense', 'expense', { bankId: 'bank' }));
    await offlineQueue.enqueue(create('unrelated'));
    const result = await syncService.syncOfflineQueue();
    expect(result).toEqual({ success: 1, failed: 1 });
    expect(expenseService.create).not.toHaveBeenCalled();
    expect(incomeService.create).toHaveBeenCalledOnce();
    expect(offlineQueue.count()).toBe(2);
  });
  it('passes the saved edit-start revision to the expense transaction', async () => {
    await offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: { id: 'expense', userId: 'user', amount: 42, revision: 8, expectedRevision: 7 } });
    const [queued] = offlineQueue.getAll();

    expect(await syncService.syncOfflineQueue()).toEqual({ success: 1, failed: 0 });
    expect(expenseService.update).toHaveBeenCalledWith('expense', { amount: 42 }, { userId: 'user', operationId: queued.id }, 7);
  });
  it('rebases chained offline edits onto the latest expense version without replaying untouched stale fields', async () => {
    const original = { id: 'expense', userId: 'user', description: 'Lunch', amount: 100, revision: 0 };
    sessionCache.set('expenses', 'user', [original]);
    await offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: { ...original, amount: 120, revision: 1, expectedRevision: 0 } });
    sessionCache.set('expenses', 'user', [{ ...original, amount: 120, revision: 1 }]);
    await offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: { ...original, amount: 120, description: 'Trip lunch', revision: 2, expectedRevision: 1 } });
    const [first] = offlineQueue.getAll();
    const claim = await offlineQueue.claimNext('user');
    expect(claim?.id).toBe(first.id);
    await offlineQueue.fail(first.id, claim!.lease!.token, new Error('EXPENSE_VERSION_CONFLICT'), false);
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 0, failed: 0 });
    expect(expenseService.update).not.toHaveBeenCalled();

    expect(await offlineQueue.rebaseExpenseUpdateChain('expense', 'user', { ...original, amount: 100, description: 'Lunch on cloud', revision: 5 })).toBe(true);
    const [rebasedFirst, rebasedSecond] = offlineQueue.getAll();
    expect(rebasedFirst.payload).toEqual({ amount: 120, id: 'expense', userId: 'user', revision: 6, expectedRevision: 5 });
    expect(rebasedSecond.payload).toEqual({ description: 'Trip lunch', id: 'expense', userId: 'user', revision: 7, expectedRevision: 6 });

    expect(await syncService.syncOfflineQueue()).toEqual({ success: 2, failed: 0 });
    expect(expenseService.update).toHaveBeenNthCalledWith(1, 'expense', { amount: 120 }, { userId: 'user', operationId: rebasedFirst.id }, 5);
    expect(expenseService.update).toHaveBeenNthCalledWith(2, 'expense', { description: 'Trip lunch' }, { userId: 'user', operationId: rebasedSecond.id }, 6);
  });
});
