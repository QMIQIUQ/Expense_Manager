import { collection, documentId, getDocsFromServer, limit, orderBy, query, startAfter, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Expense, Income, Repayment, Transfer } from '../types';
import { formatDateLocal } from '../utils/dateUtils';
import { sessionCache } from '../utils/sessionCache';
import { networkStatus } from '../utils/networkStatus';
import { getConsistentHistoryPage } from './financialSnapshotService';

export type HistoryCollection = 'expenses' | 'incomes' | 'repayments' | 'transfers';
export interface HistoryCursor { date: string; id: string }
export interface HistoryRange { startDate: string; endDate: string }
export interface HistoryPage<T> { rows: T[]; cursor?: HistoryCursor; hasMore: boolean; complete?: boolean; cached?: boolean; cacheVersion?: string }
const PAGE_SIZE = 100;
const cachedPages = new Map<string, { rows: Array<{ id: string; date: string; userId: string }>; complete: boolean }>();
export const cachedHistoryCovers = (name: HistoryCollection, userId: string, range?: HistoryRange): boolean => {
  const snapshot = sessionCache.getSnapshot<Array<{ userId: string; id: string; date: string }>>(name, userId);
  if (!snapshot || snapshot.data.some((row) => !row || row.userId !== userId || typeof row.id !== 'string' || !row.id || typeof row.date !== 'string' || !row.date)) return false;
  if (snapshot.coverage === 'all') return true;
  if (!range) return false;
  const covered = /^(?:dashboard:)?(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(snapshot.coverage ?? '');
  return !!covered && range.startDate >= covered[1] && range.endDate <= covered[2];
};
export const captureCachedHistoryVersion = (name: HistoryCollection, userId: string, range?: HistoryRange): string => {
  if (!cachedHistoryCovers(name, userId, range)) throw Object.assign(new Error('This period is not fully cached. Reconnect to complete its totals.'), { code: 'incomplete-cache' });
  return sessionCache.getSnapshot(name, userId)!.version;
};
export const assertCachedHistoryVersion = (name: HistoryCollection, userId: string, expected: string): void => {
  if (sessionCache.getSnapshot(name, userId)?.version !== expected) throw Object.assign(new Error('The saved history changed while reading. Retry with its current snapshot.'), { code: 'stale-read' });
};
export const cachedHistoryPage = <T,>(name: HistoryCollection, userId: string, range?: HistoryRange, cursor?: HistoryCursor): HistoryPage<T> => {
  const snapshot = sessionCache.getSnapshot<Array<{ id: string; date: string; userId: string }>>(name, userId);
  if (!snapshot) throw Object.assign(new Error('This history is not cached on this device'), { code: 'incomplete-cache' });
  const key = JSON.stringify([userId, name, range, snapshot.version]);
  let cached = cachedPages.get(key);
  if (!cached) {
    cached = { rows: snapshot.data.filter((row) => row && typeof row.id === 'string' && typeof row.date === 'string' && row.userId === userId && (!range || row.date >= range.startDate && row.date <= range.endDate))
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)), complete: cachedHistoryCovers(name, userId, range) };
    cachedPages.set(key, cached);
    if (cachedPages.size > 4) cachedPages.delete(cachedPages.keys().next().value!);
  }
  const available = cached.rows;
  let start = 0; let end = available.length;
  if (cursor) while (start < end) {
    const middle = Math.floor((start + end) / 2); const row = available[middle];
    if (row.date < cursor.date || row.date === cursor.date && row.id.localeCompare(cursor.id) < 0) end = middle;
    else start = middle + 1;
  }
  const rows = available.slice(start, start + PAGE_SIZE);
  const last = rows[rows.length - 1];
  return { rows: rows as T[], cursor: last ? { date: last.date, id: last.id } : undefined, hasMore: start + rows.length < available.length,
    complete: cached.complete, cached: true, cacheVersion: snapshot.version };
};

const decode = <T,>(snapshot: { id: string; data(): Record<string, unknown> }): T => {
  const data = snapshot.data();
  const date = (value: unknown) => value && typeof value === 'object' && 'toDate' in value ? (value as { toDate(): Date }).toDate() : value;
  return { ...data, id: snapshot.id, createdAt: date(data.createdAt), updatedAt: date(data.updatedAt) } as T;
};

export const getHistoryPage = async <T,>(name: HistoryCollection, userId: string, range?: HistoryRange, cursor?: HistoryCursor): Promise<HistoryPage<T>> => {
  if (!networkStatus.isOnline) return cachedHistoryPage(name, userId, range, cursor);
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];
  if (range) constraints.push(where('date', '>=', range.startDate), where('date', '<=', range.endDate));
  constraints.push(orderBy('date', 'desc'), orderBy(documentId(), 'desc'));
  if (cursor) constraints.push(startAfter(cursor.date, cursor.id));
  constraints.push(limit(PAGE_SIZE));
  const result = await getDocsFromServer(query(collection(db, name), ...constraints));
  const last = result.docs[result.docs.length - 1];
  return {
    rows: result.docs.map((document) => decode<T>(document)),
    cursor: last ? { date: String(last.data().date), id: last.id } : undefined,
    hasMore: result.size === PAGE_SIZE,
    complete: true,
  };
};

/** Explicit full-period traversal, used for exact totals and full-history exports. */
export const readHistoryRange = async <T,>(name: HistoryCollection, userId: string, range?: HistoryRange, onPage?: (rows: T[]) => void): Promise<T[]> => {
  const offline = !networkStatus.isOnline;
  const cacheVersion = offline ? captureCachedHistoryVersion(name, userId, range) : undefined;
  const rows = new Map<string, T>();
  let cursor: HistoryCursor | undefined;
  let readTime: string | undefined;
  for (;;) {
    const page = !offline ? await getConsistentHistoryPage<T & { id: string }>(name, userId, range, cursor, readTime)
      : cachedHistoryPage<T & { id: string }>(name, userId, range, cursor);
    if (cacheVersion) {
      assertCachedHistoryVersion(name, userId, cacheVersion);
      if (page.cacheVersion !== cacheVersion) throw Object.assign(new Error('Cached history page changed'), { code: 'stale-read' });
    }
    if ('readTime' in page) readTime = page.readTime as string;
    if (page.complete === false) throw Object.assign(new Error('The cached history does not cover the entire requested period'), { code: 'incomplete-cache' });
    page.rows.forEach((row) => rows.set(row.id, row));
    onPage?.([...rows.values()]);
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }
  if (cacheVersion) assertCachedHistoryVersion(name, userId, cacheVersion);
  return [...rows.values()];
};

const readMatching = async <T,>(name: HistoryCollection, userId: string, constraints: QueryConstraint[]): Promise<T[]> => {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await getDocsFromServer(query(collection(db, name), where('userId', '==', userId), ...constraints,
      orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE)));
    rows.push(...page.docs.map((document) => decode<T>(document)));
    if (page.size < PAGE_SIZE) return rows;
    cursor = page.docs[page.docs.length - 1].id;
  }
};

export const dashboardRange = (now = new Date()): HistoryRange => {
  const first = new Date(now.getFullYear(), 0, 1);
  const previous = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  return { startDate: formatDateLocal(first < previous ? first : previous), endDate: formatDateLocal(new Date(now.getFullYear() + 1, 0, 31)) };
};

const hasReceivableData = (expense: Expense): boolean => expense.needsRepaymentTracking === true || (expense.splitParticipants?.length ?? 0) > 0;
const readCompleteExpenseSnapshot = async (userId: string): Promise<{ expenses: Expense[]; receivables: Expense[] }> => {
  const generation = financialReadGeneration(userId);
  // Use the existing owner-scoped, read-time-pinned traversal. A split query on
  // an array field cannot safely claim full coverage until Firestore accepts
  // its ordering/index semantics and every page shares one read time.
  const expenses = (await readHistoryRange<Expense>('expenses', userId))
    .filter((expense) => expense.userId === userId && !!expense.id);
  if (generation !== financialReadGeneration(userId)) {
    throw Object.assign(new Error('Expense history changed while the complete snapshot was loading'), { code: 'stale-read' });
  }
  const receivables = expenses.filter(hasReceivableData);
  // Publish coverage only after every page has succeeded and the full snapshot
  // has been validated for owner and stable document identity.
  sessionCache.set('receivableExpenses', userId, receivables, { coverage: 'all' });
  return { expenses, receivables };
};

export const readDashboardExpenses = async (userId: string): Promise<Expense[]> => {
  if (!networkStatus.isOnline) {
    const [recent, receivables] = await Promise.all([
      readHistoryRange<Expense>('expenses', userId, dashboardRange()),
      readReceivableExpenses(userId),
    ]);
    return [...new Map([...recent, ...receivables].map((row) => [row.id, row])).values()]
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }
  const snapshot = await readCompleteExpenseSnapshot(userId);
  const range = dashboardRange();
  const recent = snapshot.expenses.filter((row) => row.date >= range.startDate && row.date <= range.endDate);
  const latest = snapshot.expenses.slice(0, PAGE_SIZE);
  return [...new Map([...recent, ...latest, ...snapshot.receivables].map((row) => [row.id, row])).values()]
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
};

/** Complete, owner-scoped candidate set for receivables, including older splits outside the dashboard date range. */
export const readReceivableExpenses = async (userId: string): Promise<Expense[]> => {
  if (!userId) return [];
  if (!networkStatus.isOnline) {
    const snapshot = sessionCache.getSnapshot<Expense[]>('receivableExpenses', userId);
    if (!snapshot || snapshot.coverage !== 'all' || snapshot.data.some((row) => row.userId !== userId || !row.id)) {
      throw Object.assign(new Error('Complete receivable history is not cached on this device'), { code: 'incomplete-cache' });
    }
    return snapshot.data;
  }
  return (await readCompleteExpenseSnapshot(userId)).receivables;
};

export const readDashboardIncomes = (userId: string): Promise<Income[]> => readHistoryRange('incomes', userId, dashboardRange());
export const readDashboardTransfers = (userId: string): Promise<Transfer[]> => readHistoryRange('transfers', userId, dashboardRange());
export const readRepaymentsForExpenses = async (userId: string, expenses: Expense[]): Promise<Repayment[]> => {
  const ids = [...new Set(expenses.map((row) => row.id).filter((id): id is string => !!id))];
  const result: Repayment[] = [];
  // Sequential batches bound concurrent requests for large yearly scopes.
  for (let index = 0; index < ids.length; index += 30) {
    result.push(...await readMatching<Repayment>('repayments', userId, [where('expenseId', 'in', ids.slice(index, index + 30))]));
  }
  return result;
};
export const readTransfersForExpenses = async (userId: string, expenses: Expense[]): Promise<Transfer[]> => {
  const ids = [...new Set(expenses.map((row) => row.id).filter((id): id is string => !!id))];
  const result: Transfer[] = [];
  for (let index = 0; index < ids.length; index += 30) {
    result.push(...await readMatching<Transfer>('transfers', userId, [where('expenseId', 'in', ids.slice(index, index + 30))]));
  }
  return result;
};

export type FinancialScope = 'dashboard' | 'all' | HistoryRange;
export const financialScopeKey = (scope: FinancialScope): string => typeof scope === 'string' ? scope === 'dashboard'
  ? 'dashboard:' + dashboardRange().startDate + ':' + dashboardRange().endDate : scope : scope.startDate + ':' + scope.endDate;

const scopedRequests = new Map<string, Promise<unknown[]>>();
const generations = new Map<string, number>();
export const financialReadGeneration = (userId: string): number => generations.get(userId) ?? 0;
const snapshots = new Map<string, { rows: unknown[]; timestamp: number }>();
export const invalidateFinancialReads = (userId: string): void => {
  generations.set(userId, (generations.get(userId) ?? 0) + 1);
  for (const key of snapshots.keys()) if (key.startsWith(userId + ':')) snapshots.delete(key);
};
export const financialScopeCovered = (userId: string, name: HistoryCollection, scope: FinancialScope): boolean => {
  const stored = sessionCache.getCoverage(name, userId);
  return stored === 'all' || stored === financialScopeKey(scope);
};
export const markFinancialScopeCovered = (userId: string, name: HistoryCollection, scope: FinancialScope): void => {
  if (sessionCache.getCoverage(name, userId) !== financialScopeKey(scope)) return;
  setTimeout(() => window.dispatchEvent(new Event('financial-scope-loaded')), 0);
};

const readScoped = <T,>(userId: string, name: HistoryCollection, scope: FinancialScope, fetch: () => Promise<T[]>): Promise<T[]> => {
  const generation = generations.get(userId) ?? 0;
  const key = userId + ':' + name + ':' + financialScopeKey(scope) + ':' + generation;
  const existing = scopedRequests.get(key);
  if (existing) return existing as Promise<T[]>;
  const cached = snapshots.get(key);
  if (cached && Date.now() - cached.timestamp < 30_000) return Promise.resolve(cached.rows as T[]);
  const promise = fetch().then((rows) => {
    if (generation === (generations.get(userId) ?? 0)) snapshots.set(key, { rows, timestamp: Date.now() });
    if (snapshots.size > 64) snapshots.delete(snapshots.keys().next().value!);
    return rows;
  }).finally(() => { if (scopedRequests.get(key) === promise) scopedRequests.delete(key); });
  scopedRequests.set(key, promise);
  return promise;
};

export const readScopedExpenses = (userId: string, scope: FinancialScope): Promise<Expense[]> => readScoped(userId, 'expenses', scope, async () => {
  if (scope === 'all') return (await readCompleteExpenseSnapshot(userId)).expenses;
  if (scope === 'dashboard') return readDashboardExpenses(userId);
  const dashboard = await readScopedExpenses(userId, 'dashboard');
  const window = dashboardRange();
  if (scope.startDate >= window.startDate && scope.endDate <= window.endDate) return dashboard;
  const period = await readHistoryRange<Expense>('expenses', userId, scope);
  const merged = new Map(dashboard.map((row) => [row.id, row]));
  period.forEach((row) => merged.set(row.id, row));
  return [...merged.values()].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
});
const withPeriod = async <T extends { id?: string },>(userId: string, name: HistoryCollection, scope: FinancialScope, dashboard: () => Promise<T[]>): Promise<T[]> => {
  if (scope === 'all') return readHistoryRange(name, userId);
  const recent = await dashboard();
  if (scope === 'dashboard') return recent;
  const window = dashboardRange();
  if (scope.startDate >= window.startDate && scope.endDate <= window.endDate) return recent;
  const period = await readHistoryRange<T>(name, userId, scope);
  return [...new Map([...recent, ...period].map((row) => [row.id, row])).values()];
};
export const readScopedIncomes = (userId: string, scope: FinancialScope): Promise<Income[]> => readScoped(userId, 'incomes', scope,
  () => withPeriod(userId, 'incomes', scope, () => readDashboardIncomes(userId)));
export const readScopedTransfers = (userId: string, scope: FinancialScope): Promise<Transfer[]> => readScoped(userId, 'transfers', scope,
  () => withPeriod(userId, 'transfers', scope, () => readDashboardTransfers(userId)));
export const readScopedRepayments = (userId: string, scope: FinancialScope): Promise<Repayment[]> => readScoped(userId, 'repayments', scope,
  async () => scope === 'all' ? readHistoryRange('repayments', userId) : readRepaymentsForExpenses(userId, await readScopedExpenses(userId, scope)));
