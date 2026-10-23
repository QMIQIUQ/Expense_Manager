import { financialReadGeneration, readHistoryRange, captureCachedHistoryVersion, type HistoryRange } from './historyService';
import { networkStatus } from '../utils/networkStatus';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import type { Expense } from '../types';

export interface CompleteExpensePeriod { rows: Expense[]; key: string; userId: string }
const completed = new Map<string, { snapshot: CompleteExpensePeriod; savedAt: number; bytes: number }>();
const running = new Map<string, Promise<CompleteExpensePeriod>>();
const epochs = new Map<string, number>();
const MAX_RETAINED_ROWS = 5000;
const MAX_RETAINED_BYTES = 4 * 1024 * 1024;
export const invalidateExpensePeriodReads = (userId: string): void => {
  epochs.set(userId, (epochs.get(userId) ?? 0) + 1);
  for (const [key, entry] of completed) if (entry.snapshot.userId === userId) completed.delete(key);
};
export const expensePeriodReadKey = (userId: string, range?: HistoryRange): string => JSON.stringify([
  userId, range?.startDate, range?.endDate, financialReadGeneration(userId), epochs.get(userId) ?? 0, offlineQueue.expenseRevision(userId),
  networkStatus.isOnline ? 'server' : sessionCache.getSnapshot('expenses', userId)?.version ?? 'missing',
]);

/** Raw, complete, read-time-consistent period shared by search and its exact summary. */
export const readCompleteExpensePeriod = (userId: string, range?: HistoryRange): Promise<CompleteExpensePeriod> => {
  for (const [key, entry] of completed) if (Date.now() - entry.savedAt >= 30_000) completed.delete(key);
  let key: string;
  try {
    if (!networkStatus.isOnline) captureCachedHistoryVersion('expenses', userId, range);
    key = expensePeriodReadKey(userId, range);
  } catch (error) { return Promise.reject(error); }
  const cached = completed.get(key);
  if (cached && Date.now() - cached.savedAt < 30_000) return Promise.resolve(cached.snapshot);
  const pending = running.get(key);
  if (pending) return pending;
  const request = readHistoryRange<Expense>('expenses', userId, range).then((rows) => {
    if (expensePeriodReadKey(userId, range) !== key) throw Object.assign(new Error('Period changed while loading. Retry its current version.'), { code: 'stale-read' });
    const snapshot = { key, rows, userId };
    completed.delete(key);
    // Large explicit lifetime searches remain shared while in flight, then belong to their consumers only.
    if (rows.length <= MAX_RETAINED_ROWS) {
      let bytes = 0;
      for (const row of rows) { bytes += JSON.stringify(row).length * 2; if (bytes > MAX_RETAINED_BYTES) break; }
      if (bytes <= MAX_RETAINED_BYTES) completed.set(key, { snapshot, savedAt: Date.now(), bytes });
    }
    let retainedRows = 0; let retainedBytes = 0;
    for (const entry of completed.values()) { retainedRows += entry.snapshot.rows.length; retainedBytes += entry.bytes; }
    while (completed.size > 4 || retainedRows > MAX_RETAINED_ROWS || retainedBytes > MAX_RETAINED_BYTES) {
      const oldest = completed.keys().next().value!;
      const entry = completed.get(oldest)!;
      retainedRows -= entry.snapshot.rows.length; retainedBytes -= entry.bytes;
      completed.delete(oldest);
    }
    return snapshot;
  }).finally(() => { if (running.get(key) === request) running.delete(key); });
  running.set(key, request);
  return request;
};
