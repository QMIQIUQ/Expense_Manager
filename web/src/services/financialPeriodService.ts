import type { Expense, Income, Repayment, Transfer } from '../types';
import { getConsistentHistoryPage } from './financialSnapshotService';
import { assertCachedHistoryVersion, cachedHistoryPage, captureCachedHistoryVersion, financialReadGeneration, type HistoryCollection, type HistoryCursor, type HistoryRange } from './historyService';
import { networkStatus } from '../utils/networkStatus';
import { offlineQueue } from '../utils/offlineQueue';
import { applyPendingOperations } from '../utils/pendingOperations';

export interface FinancialPeriod {
  expenses: Expense[]; incomes: Income[]; repayments: Repayment[]; transfers: Transfer[];
  readTime?: string; range: HistoryRange;
}
const names: HistoryCollection[] = ['expenses', 'incomes', 'repayments', 'transfers'];
const pendingKey = (userId: string) => JSON.stringify(offlineQueue.getAll().filter((row) =>
  ['expense', 'income', 'repayment', 'transfer', 'scheduledPaymentRecord'].includes(row.entity) && (row.payload as { userId?: string })?.userId === userId)
  .map(({ id, type, entity, payload, status }) => ({ id, type, entity, payload, status })));
const requests = new Map<string, Promise<FinancialPeriod>>();

/** Every collection and cursor page is pinned to one server read time, or one coherent set of cache versions. */
export const readFinancialPeriod = (userId: string, range: HistoryRange, transaction?: string): Promise<FinancialPeriod> => {
  const online = !!transaction || networkStatus.isOnline;
  const generation = financialReadGeneration(userId);
  const queue = pendingKey(userId);
  const versions = new Map(names.map((name) => [name, online ? undefined : captureCachedHistoryVersion(name, userId, range)]));
  const key = JSON.stringify([userId, range, online, generation, queue, [...versions], transaction]);
  const existing = requests.get(key); if (existing) return existing;
  const request = (async () => {
    const output = { range } as FinancialPeriod;
    let readTime: string | undefined;
    for (const name of names) {
      const rows: Array<Expense | Income | Repayment | Transfer> = [];
      let cursor: HistoryCursor | undefined;
      for (;;) {
        const page = online ? await getConsistentHistoryPage<Expense | Income | Repayment | Transfer>(name, userId, range, cursor, readTime, undefined, transaction)
          : cachedHistoryPage<Expense | Income | Repayment | Transfer>(name, userId, range, cursor);
        if ('readTime' in page) readTime ??= page.readTime as string;
        if (page.complete === false) throw Object.assign(new Error('Incomplete financial period'), { code: 'incomplete-cache' });
        if (!online) assertCachedHistoryVersion(name, userId, versions.get(name)!);
        rows.push(...page.rows);
        if (!page.hasMore || !page.cursor) break;
        cursor = page.cursor;
      }
      Object.assign(output, { [name]: (transaction ? rows : applyPendingOperations(name, userId, rows)).filter((row) => row.date >= range.startDate && row.date <= range.endDate) });
    }
    for (const [name, version] of versions) if (version) assertCachedHistoryVersion(name, userId, version);
    if (!transaction && (financialReadGeneration(userId) !== generation || pendingKey(userId) !== queue)) throw Object.assign(new Error('Financial records changed while reading. Retry.'), { code: 'stale-read' });
    return { ...output, readTime };
  })().finally(() => requests.delete(key));
  requests.set(key, request); return request;
};
