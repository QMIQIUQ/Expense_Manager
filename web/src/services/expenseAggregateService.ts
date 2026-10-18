import type { CurrencyCode, Expense } from '../types';
import { assertCachedHistoryVersion, cachedHistoryPage, captureCachedHistoryVersion, type HistoryCursor, type HistoryRange } from './historyService';
import { networkStatus } from '../utils/networkStatus';
import { getConsistentHistoryPage } from './financialSnapshotService';
import { getExpenseDisplaySource } from '../utils/currencyUtils';
import { convertAmountToCurrency } from './currencyRateService';
import { offlineQueue } from '../utils/offlineQueue';
import { applyPendingOperations } from '../utils/pendingOperations';

export interface ExpenseAggregate {
  count: number; total: number; categories: Record<string, number>; months: Record<string, number>;
  startDate?: string; endDate?: string;
}
/** Summary traversal retains only a page plus scalar category/month totals.
 * Conversion is per record, preserving currency minor-unit rounding and legacy valuations.
 */
export const readExpenseAggregate = async (userId: string, currency: CurrencyCode, range: HistoryRange | undefined,
  select: (rows: Expense[]) => Expense[], current: () => boolean): Promise<ExpenseAggregate> => {
  const offline = !networkStatus.isOnline;
  const cacheVersion = offline ? captureCachedHistoryVersion('expenses', userId, range) : undefined;
  const result: ExpenseAggregate = { count: 0, total: 0, categories: Object.create(null), months: Object.create(null) };
  const pending = offlineQueue.getAll();
  const localIds = new Set(pending.filter((operation) => (operation.payload as { userId?: string })?.userId === userId)
    .flatMap((operation) => {
      const payload = operation.payload as { id?: string; generatedExpenseId?: string; generatedExpensePayload?: { id?: string } };
      return operation.entity === 'expense' ? [payload.id] : operation.entity === 'scheduledPaymentRecord' ? [payload.generatedExpensePayload?.id ?? payload.generatedExpenseId ?? operation.localSnapshot?.generatedExpenseId] : [];
    }).filter(Boolean));
  const add = async (rows: Expense[]) => {
    for (const row of select(rows).filter((row) => !range || row.date >= range.startDate && row.date <= range.endDate)) {
      if (!current()) throw Object.assign(new Error('Summary superseded'), { code: 'stale-read' });
      const source = getExpenseDisplaySource(row, currency);
      const value = await convertAmountToCurrency(source.amount, source.sourceCurrency, currency, row.date);
      result.count++; result.total += value;
      result.categories[row.category] = (result.categories[row.category] ?? 0) + value;
      const month = row.date.slice(0, 7);
      result.months[month] = (result.months[month] ?? 0) + value;
      if (!result.startDate || row.date < result.startDate) result.startDate = row.date;
      if (!result.endDate || row.date > result.endDate) result.endDate = row.date;
    }
  };
  const projected: Expense[] = [];
  let cursor: HistoryCursor | undefined;
  let readTime: string | undefined;
  for (;;) {
    if (!current()) throw Object.assign(new Error('Summary superseded'), { code: 'stale-read' });
    const page = !offline ? await getConsistentHistoryPage<Expense>('expenses', userId, range, cursor, readTime)
      : cachedHistoryPage<Expense>('expenses', userId, range, cursor);
    if (page.complete === false) throw Object.assign(new Error('The saved period is incomplete'), { code: 'incomplete-cache' });
    if (cacheVersion) {
      assertCachedHistoryVersion('expenses', userId, cacheVersion);
      if (page.cacheVersion !== cacheVersion) throw Object.assign(new Error('Cached summary page changed'), { code: 'stale-read' });
    }
    if ('readTime' in page) readTime = page.readTime as string;
    // Pending identities are deferred to avoid counting a create echoed by Firebase twice.
    const affected = page.rows.filter((row) => localIds.has(row.id));
    projected.push(...affected);
    await add(page.rows.filter((row) => !localIds.has(row.id)));
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }
  await add(applyPendingOperations('expenses', userId, projected, pending));
  if (cacheVersion) assertCachedHistoryVersion('expenses', userId, cacheVersion);
  if (!current()) throw Object.assign(new Error('Summary superseded'), { code: 'stale-read' });
  return result;
};
