import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineQueue, type QueuedOperation } from './offlineQueue';
import { sessionCache } from './sessionCache';
import { applyPendingOperations, cacheEntityFor } from './pendingOperations';
import { getQueuedWriteId, isLocalWriteActive, writeLocalFirst, writeLocalFirstBatch } from './localFirstMutation';

const collections = ['expense', 'income', 'transfer', 'category', 'budget', 'card', 'bank', 'ewallet',
  'repayment', 'scheduledPayment', 'scheduledPaymentRecord', 'quickExpensePreset', 'recurring'] as const;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe('durable local-first writes', () => {
  it.each(collections)('%s survives offline submission and reload without calling Firebase', async (entity) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const save = vi.fn();
    const error = await writeLocalFirst({ type: 'create', entity, payload: { id: 'local', userId: 'user', name: 'Local item' } }, save).catch((failure) => failure);
    expect(getQueuedWriteId(error)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    sessionStorage.clear();
    const rows = sessionCache.get<{ id: string }[]>(cacheEntityFor(entity), 'user');
    expect(rows?.map((row) => row.id)).toEqual(['local']);
    expect(offlineQueue.getAll()).toHaveLength(1);
  });

  it('persists and displays the write while the server promise is still unresolved', async () => {
    let finish!: (id: string) => void;
    const pending = writeLocalFirst({ type: 'create', entity: 'income', payload: { id: 'income', userId: 'user', amount: 25 } },
      () => new Promise<string>((resolve) => { finish = resolve; }));
    const [operation] = offlineQueue.getAll();
    expect(isLocalWriteActive(operation.id)).toBe(true);
    expect(sessionCache.get('incomes', 'user')).toEqual([expect.objectContaining({ id: 'income', amount: 25 })]);
    finish('income');
    expect(await pending).toBe('income');
    expect(offlineQueue.getAll()).toEqual([]);
    expect(isLocalWriteActive(operation.id)).toBe(false);
  });

  it('keeps later edits behind an unfinished create, including cross-entity dependencies', async () => {
    let finish!: () => void;
    const first = writeLocalFirst({ type: 'create', entity: 'bank', payload: { id: 'bank', userId: 'user' } },
      () => new Promise<void>((resolve) => { finish = resolve; }));
    const update = vi.fn();
    const error = await writeLocalFirst({ type: 'create', entity: 'expense', payload: { id: 'expense', userId: 'user', bankId: 'bank' } }, update).catch((failure) => failure);
    expect(getQueuedWriteId(error)).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
    finish();
    await first;
    expect(offlineQueue.getAll().map((operation) => operation.entity)).toEqual(['expense']);
  });

  it('rolls back persisted optimistic data on a permanent failure', async () => {
    const error = Object.assign(new Error('denied'), { code: 'permission-denied' });
    await expect(writeLocalFirst({ type: 'create', entity: 'income', payload: { id: 'income', userId: 'user' } },
      () => Promise.reject(error))).rejects.toBe(error);
    expect(offlineQueue.getAll()).toEqual([]);
    expect(sessionCache.get('incomes', 'user')).toEqual([]);
  });

  it('does not contact the server if local persistence fails', async () => {
    vi.spyOn(offlineQueue, 'save').mockReturnValue(false);
    const save = vi.fn();
    await expect(writeLocalFirst({ type: 'create', entity: 'income', payload: { id: 'income', userId: 'user' } }, save))
      .rejects.toMatchObject({ code: 'local-persistence-failed' });
    expect(save).not.toHaveBeenCalled();
  });

  it('persists category reordering as one batch before an offline acknowledgement', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const save = vi.fn();
    await writeLocalFirstBatch(['b', 'a'].map((id, order) => ({ type: 'update', entity: 'category', payload: { id, order, userId: 'user' } })), save).catch(() => undefined);
    expect(offlineQueue.getAll().map((operation) => operation.payload)).toEqual([
      { id: 'b', order: 0, userId: 'user' }, { id: 'a', order: 1, userId: 'user' },
    ]);
    expect(save).not.toHaveBeenCalled();
  });

  it('retains explicit field removals when serializing and restoring a queued update', () => {
    offlineQueue.enqueue({ type: 'update', entity: 'income', payload: { id: 'income', userId: 'user', bankId: undefined } });
    const payload = offlineQueue.getAll()[0].payload as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(payload, 'bankId')).toBe(true);
    expect(payload.bankId).toBeUndefined();
  });
});

describe('reconciling every collection after reload or background reads', () => {
  it.each(collections)('%s preserves pending create/update/delete and isolates the owner', (entity) => {
    const operations: QueuedOperation[] = [
      { id: '1', entity, type: 'create', payload: { id: 'new', userId: 'user', value: 1 }, timestamp: 1, retryCount: 0 },
      { id: '2', entity, type: 'update', payload: { id: 'new', userId: 'user', value: 2 }, timestamp: 2, retryCount: 0 },
      { id: '3', entity, type: 'delete', payload: { id: 'old', userId: 'user' }, timestamp: 3, retryCount: 0 },
      { id: '4', entity, type: 'create', payload: { id: 'foreign', userId: 'other' }, timestamp: 4, retryCount: 0 },
    ];
    const server = [{ id: 'old', userId: 'user', value: 0 }];
    const result = applyPendingOperations(cacheEntityFor(entity), 'user', server, operations);
    expect(result).toEqual([expect.objectContaining({ id: 'new', value: 2 })]);
    expect(server[0].id).toBe('old');
  });

  it('restores settings, layout and friend preferences, including writes needing attention', () => {
    offlineQueue.enqueue({ type: 'update', entity: 'userSettings', payload: { userId: 'user', updates: { displayCurrency: 'TWD' } } });
    offlineQueue.enqueue({ type: 'update', entity: 'dashboardLayout', payload: { userId: 'user', widgets: [{ id: 'widget' }] } });
    offlineQueue.enqueue({ type: 'update', entity: 'friendPreference', payload: { id: 'friend', userId: 'user', preference: { mode: 'categories' } } });
    expect(applyPendingOperations('userSettings', 'user', { displayCurrency: 'MYR' }).displayCurrency).toBe('TWD');
    expect(applyPendingOperations('dashboardLayout', 'user', { widgets: [] }).widgets).toEqual([{ id: 'widget' }]);
    expect(applyPendingOperations('friendPreferences', 'user', [])).toEqual([expect.objectContaining({ id: 'friend', preference: { mode: 'categories' } })]);
    const operation = offlineQueue.getAll()[0];
    offlineQueue.save([{ ...operation, status: 'needs-attention' }]);
    expect(applyPendingOperations('userSettings', 'user', { displayCurrency: 'MYR' }).displayCurrency).toBe('TWD');
  });

  it('projects an automatically generated expense while the payment record is still queued', () => {
    offlineQueue.enqueue({ type: 'create', entity: 'scheduledPaymentRecord', payload: { id: 'record', userId: 'user',
      generatedExpensePayload: { id: 'expense', userId: 'user', amount: 50 } } });
    expect(applyPendingOperations('expenses', 'user', [])).toEqual([expect.objectContaining({ id: 'expense', amount: 50 })]);
  });
});
