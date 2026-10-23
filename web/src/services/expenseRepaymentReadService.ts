import type { Repayment } from '../types';
import { getConsistentHistoryPage } from './financialSnapshotService';
import { assertCachedHistoryVersion, captureCachedHistoryVersion, cachedHistoryPage, financialReadGeneration, type HistoryCursor } from './historyService';
import { networkStatus } from '../utils/networkStatus';

const requests = new Map<string, Promise<Repayment[]>>();
export const readExpenseRepayments = (userId: string, expenseId: string): Promise<Repayment[]> => {
  const online = networkStatus.isOnline;
  const version = online ? undefined : captureCachedHistoryVersion('repayments', userId);
  const key = JSON.stringify([userId, expenseId, online, version, financialReadGeneration(userId)]);
  const current = requests.get(key); if (current) return current;
  const request = (async () => {
    const rows: Repayment[] = []; let cursor: HistoryCursor | undefined; let readTime: string | undefined;
    for (;;) {
      const page = online ? await getConsistentHistoryPage<Repayment>('repayments', userId, undefined, cursor, readTime, expenseId)
        : cachedHistoryPage<Repayment>('repayments', userId, undefined, cursor);
      if ('readTime' in page) readTime ??= page.readTime as string;
      if (version) assertCachedHistoryVersion('repayments', userId, version);
      rows.push(...page.rows.filter((row) => row.expenseId === expenseId));
      if (!page.hasMore || !page.cursor) break;
      cursor = page.cursor;
    }
    return rows;
  })().finally(() => requests.delete(key));
  requests.set(key, request); return request;
};
