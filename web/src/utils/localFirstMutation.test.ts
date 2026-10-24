import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineQueue, type QueuedOperation } from './offlineQueue';
import { readOutbox, changeOutbox, migrateLegacyOutbox } from './indexedDbOutbox';
import { sessionCache } from './sessionCache';
import { applyPendingOperations, cacheEntityFor } from './pendingOperations';
import { getQueuedWriteId, writeLocalFirst, writeLocalFirstBatch } from './localFirstMutation';

const collections = ['expense', 'income', 'transfer', 'category', 'budget', 'card', 'bank', 'ewallet',
  'repayment', 'scheduledPayment', 'scheduledPaymentRecord', 'quickExpensePreset', 'recurring'] as const;
beforeEach(async () => {
  localStorage.clear(); sessionStorage.clear(); sessionCache.clearAll();
  await offlineQueue.clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());
const create = (id: string, entity: QueuedOperation['entity'] = 'income', extra = {}) => ({
  type: 'create' as const, entity, payload: { id, userId: 'user', ...extra },
});

describe('durable local-first writes', () => {
  it.each(collections)('%s persists before acceptance and never executes a foreground write', async (entity) => {
    const save = vi.fn();
    const failure = await writeLocalFirst(create('local', entity), save).catch((error) => error);
    expect(getQueuedWriteId(failure)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    expect(await readOutbox()).toHaveLength(1);
    expect(sessionCache.get<{ id: string }[]>(cacheEntityFor(entity), 'user')?.map((row) => row.id)).toEqual(['local']);
    await offlineQueue.refresh();
    expect(offlineQueue.getAll()).toHaveLength(1);
  });
  it('rejects acceptance if the durable transaction fails', async () => {
    vi.spyOn(offlineQueue, 'enqueueMany').mockResolvedValueOnce(null);
    const save = vi.fn();
    await expect(writeLocalFirst(create('local'), save)).rejects.toMatchObject({ code: 'local-persistence-failed' });
    expect(save).not.toHaveBeenCalled();
    expect(sessionCache.get('incomes', 'user')).toBeNull();
  });
  it('commits an ordered batch before acknowledging', async () => {
    const save = vi.fn();
    await writeLocalFirstBatch(['b', 'a'].map((id, order) => ({ type: 'update', entity: 'category', payload: { id, order, userId: 'user' } })), save).catch(() => undefined);
    expect((await readOutbox()).map((operation) => operation.payload)).toEqual([
      { id: 'b', order: 0, userId: 'user' }, { id: 'a', order: 1, userId: 'user' },
    ]);
    expect(save).not.toHaveBeenCalled();
  });
  it('preserves undefined field removals through an IndexedDB round trip', async () => {
    await offlineQueue.enqueue({ type: 'update', entity: 'income', payload: { id: 'income', userId: 'user', bankId: undefined } });
    const payload = (await readOutbox())[0].payload as Record<string, unknown>;
    expect(Object.hasOwn(payload, 'bankId')).toBe(true);
    expect(payload.bankId).toBeUndefined();
  });
});

describe('transactional outbox coordination', () => {
  it('serializes simultaneous enqueues and distinct claims without lost rows', async () => {
    await Promise.all(Array.from({ length: 40 }, (_, index) => offlineQueue.enqueue(create(String(index)))));
    const durable = await readOutbox();
    expect(durable).toHaveLength(40);
    expect(new Set(durable.map((row) => row.sequence)).size).toBe(40);
    const claims = await Promise.all([offlineQueue.claimNext('user'), offlineQueue.claimNext('user')]);
    expect(claims.every(Boolean)).toBe(true);
    expect(claims[0]?.id).not.toBe(claims[1]?.id);
  });
  it('blocks dependents of a failed create and retains permanent failures', async () => {
    await offlineQueue.enqueue(create('bank', 'bank'));
    await offlineQueue.enqueue(create('expense', 'expense', { bankId: 'bank' }));
    const bank = (await offlineQueue.claimNext('user'))!;
    expect(bank.entity).toBe('bank');
    await offlineQueue.fail(bank.id, bank.lease!.token, new Error('denied'), false);
    expect(await offlineQueue.claimNext('user')).toBeNull();
    expect(offlineQueue.nextWakeAt('user')).toBeUndefined();
    expect((await readOutbox())[0]).toMatchObject({ status: 'needs-attention', retryCount: 1 });
    expect(await offlineQueue.retry(bank.id)).toBe(true);
    expect((await offlineQueue.claimNext('user'))?.id).toBe(bank.id);
  });
  it('fences stale completion and recovers an expired lease after reopening', async () => {
    await offlineQueue.enqueue(create('income'));
    const first = (await offlineQueue.claimNext('user'))!;
    expect(await offlineQueue.retry(first.id)).toBe(false);
    await changeOutbox((rows) => ({ rows: rows.map((row) => ({ ...row, lease: { ...row.lease!, expiresAt: 0 } })), result: undefined }));
    await offlineQueue.refresh();
    const recovered = (await offlineQueue.claimNext('user'))!;
    expect(recovered.lease?.token).not.toBe(first.lease?.token);
    expect(await offlineQueue.complete(first.id, first.lease!.token)).toBe(false);
    expect(await offlineQueue.complete(recovered.id, recovered.lease!.token)).toBe(true);
    expect(await readOutbox()).toEqual([]);
  });
  it('persists retry deadlines and isolates accounts', async () => {
    await offlineQueue.enqueue(create('income'));
    await offlineQueue.enqueue({ ...create('other'), payload: { id: 'other', userId: 'other' } });
    const row = (await offlineQueue.claimNext('user'))!;
    await offlineQueue.fail(row.id, row.lease!.token, new Error('offline'), true);
    expect(await offlineQueue.claimNext('user')).toBeNull();
    expect((await readOutbox())[0].nextAttemptAt).toBeGreaterThan(Date.now());
    await offlineQueue.clear('user');
    expect((await readOutbox()).map((row) => (row.payload as { userId: string }).userId)).toEqual(['other']);
  });
  it('never retries an ambiguous legacy create through ordinary retry APIs', async () => {
    const legacy: QueuedOperation = { id: 'legacy', type: 'create', entity: 'expense', payload: { id: 'uncertain', userId: 'user' }, timestamp: 1, retryCount: 0, status: 'needs-attention', legacyAmbiguous: true };
    await changeOutbox(() => ({ rows: [legacy], result: undefined }));
    await offlineQueue.refresh();
    expect(await offlineQueue.retry('legacy')).toBe(false);
    expect(await offlineQueue.retryExpenseOperationsForId('uncertain', 'user')).toBe(false);
    expect(await offlineQueue.claimNext('user')).toBeNull();
  });
  it('will not discard a claimed write while another worker may commit it', async () => {
    await offlineQueue.enqueue(create('active'));
    const claimed = (await offlineQueue.claimNext('user'))!;
    await expect(offlineQueue.discardUserPending('user')).rejects.toMatchObject({ code: 'active-operations' });
    expect(offlineQueue.count()).toBe(1);
    await offlineQueue.complete(claimed.id, claimed.lease!.token);
    await offlineQueue.discardUserPending('user');
    expect(offlineQueue.count()).toBe(0);
  });
  it('migrates legacy source order exactly once despite equal timestamps', async () => {
    const rows: QueuedOperation[] = ['z', 'a'].map((id) => ({ id, type: 'create', entity: 'income', payload: { id, userId: 'user' }, timestamp: 1, retryCount: 0 }));
    const source = JSON.stringify(rows);
    localStorage.setItem('offline_operations_queue', source);
    await Promise.all([migrateLegacyOutbox((value) => value as QueuedOperation[]), migrateLegacyOutbox((value) => value as QueuedOperation[])]);
    expect((await readOutbox()).map((row) => row.id)).toEqual(['z', 'a']);
    localStorage.setItem('offline_operations_queue', source);
    await migrateLegacyOutbox((value) => value as QueuedOperation[]);
    expect(await readOutbox()).toHaveLength(2);
    expect(localStorage.getItem('offline_operations_queue')).toBeNull();
  });
});

describe('reconciling collection snapshots', () => {
  it.each(collections)('%s overlays ordered changes and isolates the owner', (entity) => {
    const operations: QueuedOperation[] = [
      { id: '1', entity, type: 'create', payload: { id: 'new', userId: 'user', value: 1 }, timestamp: 1, retryCount: 0 },
      { id: '2', entity, type: 'update', payload: { id: 'new', userId: 'user', value: 2 }, timestamp: 2, retryCount: 0 },
      { id: '3', entity, type: 'delete', payload: { id: 'old', userId: 'user' }, timestamp: 3, retryCount: 0 },
      { id: '4', entity, type: 'create', payload: { id: 'foreign', userId: 'other' }, timestamp: 4, retryCount: 0 },
    ];
    const server = [{ id: 'old', userId: 'user', value: 0 }];
    expect(applyPendingOperations(cacheEntityFor(entity), 'user', server, operations)).toEqual([expect.objectContaining({ id: 'new', value: 2 })]);
    expect(server[0].id).toBe('old');
  });
  it('projects generated expenses while the confirmation is queued', async () => {
    await offlineQueue.enqueue(create('record', 'scheduledPaymentRecord', { generatedExpensePayload: { id: 'expense', userId: 'user', amount: 50 } }));
    expect(applyPendingOperations('expenses', 'user', [])).toEqual([expect.objectContaining({ id: 'expense', amount: 50 })]);
  });
  it('projects expense deletion to its linked transfers until the transaction is confirmed', async () => {
    await offlineQueue.enqueue({ type: 'delete', entity: 'expense', payload: {
      id: 'expense', userId: 'user', relatedTransferIds: ['linked-transfer'],
    } });
    const visible = applyPendingOperations('transfers', 'user', [
      { id: 'linked-transfer', userId: 'user', amount: 10 },
      { id: 'unrelated-transfer', userId: 'user', amount: 5 },
    ]);
    expect(visible.map((row) => row.id)).toEqual(['unrelated-transfer']);
  });
  it('removes a generated expense immediately when its payment record deletion is accepted locally', async () => {
    sessionCache.set('expenses', 'user', [{ id: 'expense', userId: 'user', amount: 50 }]);
    await writeLocalFirst({ type: 'delete', entity: 'scheduledPaymentRecord', payload: { id: 'record', userId: 'user', generatedExpenseId: 'expense' } }, vi.fn()).catch(() => undefined);
    expect(sessionCache.get('expenses', 'user')).toEqual([]);
    expect(applyPendingOperations('expenses', 'user', [{ id: 'expense', userId: 'user', amount: 50 }])).toEqual([]);
  });
  it('restores a rejected budget limit without removing its durable failed operation', async () => {
    sessionCache.set('userSettings', 'user', { userId: 'user', overallBudgetLimits: { monthly: 100 } });
    await offlineQueue.enqueue({ type: 'update', entity: 'userSettings', payload: { userId: 'user', updates: {}, overallBudgetLimit: { period: 'monthly', amount: 50 }, previousOverallBudgetLimit: { period: 'monthly', amount: 100 } } });
    const claimed = (await offlineQueue.claimNext('user'))!;
    await offlineQueue.fail(claimed.id, claimed.lease!.token, new Error('limit-below-allocation'), false);
    expect(applyPendingOperations('userSettings', 'user', { overallBudgetLimits: { monthly: 50 } }).overallBudgetLimits.monthly).toBe(100);
    expect(offlineQueue.count()).toBe(1);
    await offlineQueue.retry(claimed.id);
    expect(applyPendingOperations('userSettings', 'user', { overallBudgetLimits: { monthly: 100 } }).overallBudgetLimits.monthly).toBe(50);
  });
});
