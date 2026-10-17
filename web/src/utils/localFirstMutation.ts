import { offlineQueue, type QueuedOperation } from './offlineQueue';
import { sessionCache, type CacheableEntity } from './sessionCache';
import { applyPendingOperations, cacheEntityFor } from './pendingOperations';

export type LocalMutation = Pick<QueuedOperation, 'type' | 'entity' | 'payload'>;
const activeWrites = new Set<string>();

export const isLocalWriteActive = (operationId: string): boolean => activeWrites.has(operationId);

class QueuedWrite extends Error {
  readonly code = 'unavailable';
  constructor(readonly operationId: string) {
    super('Operation saved locally for background sync');
  }
}

export const getQueuedWriteId = (error: unknown): string | null =>
  error instanceof QueuedWrite ? error.operationId : null;

export const queueFailedWrite = (error: unknown, mutation: LocalMutation): string | null =>
  getQueuedWriteId(error) ?? (isRetryableWriteError(error) ? offlineQueue.enqueue(mutation) : null);

export const isRetryableWriteError = (error: unknown): boolean => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code).toLowerCase().split('/').pop()
    : '';
  if (['permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition', 'local-persistence-failed'].includes(code || '')) return false;
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code || '')) return true;
  const message = error instanceof Error ? error.message : '';
  if (/permission|invalid-allocation|invalid-limit|limit-below-allocation|budget-(?:owner|id|not-found)|user-settings-not-found/i.test(message)) return false;
  return /network|offline|Failed to fetch/i.test(message) || (typeof navigator !== 'undefined' && !navigator.onLine);
};

/** Persist before calling Firebase, so closing or reloading the page cannot lose an accepted write. */
export const writeLocalFirst = <T>(mutation: LocalMutation, write: () => Promise<T>): Promise<T> =>
  writeLocalFirstBatch([mutation], write);

export const writeLocalFirstBatch = async <T>(mutations: LocalMutation[], write: () => Promise<T>): Promise<T> => {
  if (!mutations.length) return write();
  const owner = (mutations[0].payload as { userId?: unknown } | null)?.userId;
  const baselines = new Map<CacheableEntity, unknown>();
  for (const mutation of mutations) {
    const payload = mutation.payload as { userId?: unknown; id?: unknown } | null;
    const singleton = ['userSettings', 'featureSettings', 'dashboardLayout'].includes(mutation.entity);
    if (typeof owner !== 'string' || !owner || payload?.userId !== owner || (!singleton && (typeof payload.id !== 'string' || !payload.id))) {
      throw Object.assign(new Error('A local write requires its owner and stable document ID'), { code: 'invalid-argument' });
    }
    const entity = cacheEntityFor(mutation.entity);
    if (!baselines.has(entity)) baselines.set(entity, sessionCache.get(entity, owner) ?? (singleton ? null : []));
  }
  const userId = owner as string;

  // Keep chronological order for one account, including writes to dependent accounts/categories.
  const hasEarlierWrite = offlineQueue.getAll().some((operation) =>
    (operation.payload as { userId?: unknown } | null)?.userId === userId);
  const operationIds = offlineQueue.enqueueMany(mutations);
  if (!operationIds) {
    throw Object.assign(new Error('Unable to save the pending operation on this device'), { code: 'local-persistence-failed' });
  }
  for (const [entity, baseline] of baselines) sessionCache.set(entity, userId, applyPendingOperations(entity, userId, baseline));
  if (hasEarlierWrite || (typeof navigator !== 'undefined' && !navigator.onLine)) throw new QueuedWrite(operationIds[0]);

  operationIds.forEach((id) => activeWrites.add(id));
  try {
    const result = await write();
    offlineQueue.dequeueMany(operationIds);
    return result;
  } catch (error) {
    if (isRetryableWriteError(error)) throw new QueuedWrite(operationIds[0]);
    offlineQueue.dequeueMany(operationIds);
    for (const [entity, baseline] of baselines) sessionCache.set(entity, userId, applyPendingOperations(entity, userId, baseline));
    throw error;
  } finally {
    operationIds.forEach((id) => activeWrites.delete(id));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('offline-queue-changed'));
  }
};
