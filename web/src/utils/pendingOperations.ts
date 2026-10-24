import { DEFAULT_FEATURES, type Expense } from '../types';
import { offlineQueue, type QueuedOperation } from './offlineQueue';
import type { CacheableEntity } from './sessionCache';
import { applyExpenseViewChange, type ExpenseViewChange } from './expenseViewPreferences';
import type { ExpenseViewPreferences } from '../types/expensePeriod';
import { hasReceivablePlan } from './expenseSplitCalculator';

const entities: Record<CacheableEntity, QueuedOperation['entity']> = {
  expenses: 'expense', receivableExpenses: 'expense', categories: 'category', budgets: 'budget', recurring: 'recurring',
  incomes: 'income', cards: 'card', banks: 'bank', ewallets: 'ewallet', repayments: 'repayment',
  transfers: 'transfer', scheduledPayments: 'scheduledPayment', scheduledPaymentRecords: 'scheduledPaymentRecord',
  quickExpensePresets: 'quickExpensePreset', featureSettings: 'featureSettings', userSettings: 'userSettings',
  friendPreferences: 'friendPreference',
  dashboardLayout: 'dashboardLayout',
  expenseTags: 'expenseTag',
  accountReconciliations: 'accountReconciliation',
  reconciliationMarks: 'reconciliationMark',
  receiptAttachments: 'receiptAttachment',
};
export const cacheEntityFor = (entity: QueuedOperation['entity']): CacheableEntity =>
  (Object.keys(entities) as CacheableEntity[]).find((key) => entities[key] === entity)!;

const timestampVersion = (value: unknown): number | undefined => {
  const timestamp = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : undefined;
};
const expenseVersion = (expense: Expense): number | undefined => timestampVersion(expense.updatedAt ?? expense.createdAt);
const preferExpenseVersion = (previous: Expense | undefined, incoming: Expense): boolean => {
  if (!previous) return true;
  const previousUpdatedAt = timestampVersion(previous.updatedAt);
  const incomingUpdatedAt = timestampVersion(incoming.updatedAt);
  // A legacy page row without updatedAt cannot displace a row whose update
  // timestamp has already been verified, even if its createdAt looks newer.
  if (previousUpdatedAt !== undefined && incomingUpdatedAt === undefined) return false;
  const previousVersion = expenseVersion(previous);
  const incomingVersion = expenseVersion(incoming);
  if (incomingVersion === undefined) return previousVersion === undefined;
  return previousVersion === undefined || incomingVersion >= previousVersion;
};

export interface ExpenseMergeOptions {
  /** Complete replaces the collection; partial preserves records outside the fetched page. */
  mode?: 'partial' | 'complete';
  /** A complete receivable candidate set may prune stale tracked rows during a partial dashboard read. */
  authoritativeReceivableIds?: ReadonlySet<string>;
  /** Cached rows cannot establish newer receivable eligibility; verified pages can. */
  incomingSource?: 'cached' | 'verified-partial' | 'verified-complete';
}

/** Merge owner-scoped expense data while respecting whether each source is complete or paged. */
export const mergeExpenseRows = (
  cachedRows: Expense[],
  incomingRows: Expense[],
  userId: string,
  operations = offlineQueue.getAll(),
  options: ExpenseMergeOptions = {},
): Expense[] => {
  const mode = options.mode ?? 'partial';
  const pendingReceivableIds = new Set(operations.filter((operation) => {
    if (operation.entity !== 'expense' || !['create', 'update'].includes(operation.type)) return false;
    const payload = operation.payload as Partial<Expense>;
    return payload.userId === userId && typeof payload.id === 'string' && hasReceivablePlan(payload as Expense);
  }).map((operation) => (operation.payload as Expense).id!));
  // Absence is negative evidence only when the candidate snapshot is complete.
  // A history-page snapshot confirms rows it contains, but says nothing about
  // older cached receivables outside that page.
  const authoritativeReceivableIds = options.authoritativeReceivableIds;
  const isCurrentCachedReceivable = (row: Expense): boolean => !hasReceivablePlan(row) ||
    pendingReceivableIds.has(row.id!) || !authoritativeReceivableIds || authoritativeReceivableIds.has(row.id!);
  const selected = new Map<string, Expense>();
  for (const row of cachedRows) {
    if (mode === 'complete' || !row || row.userId !== userId || !row.id || !isCurrentCachedReceivable(row)) continue;
    const previous = selected.get(row.id);
    if (preferExpenseVersion(previous, row)) selected.set(row.id, row);
  }
  for (const row of incomingRows) {
    // Cached-first reads can contain an obsolete expense snapshot. Only a
    // verified history page may introduce a receivable absent from the cached
    // candidate set; a full revalidation then restores complete coverage.
    if (!row || row.userId !== userId || !row.id) continue;
    if (options.incomingSource === 'cached' && !isCurrentCachedReceivable(row)) continue;
    const previous = selected.get(row.id);
    if (preferExpenseVersion(previous, row)) selected.set(row.id, row);
  }
  // Outbox operations are idempotent and must be projected after selecting the
  // authoritative rows so creates, updates and deletes apply in queue order.
  const projected = applyPendingOperations('expenses', userId, [...selected.values()], operations) as Expense[];
  return projected.filter((row) => row?.userId === userId && !!row.id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
};

/** Update a complete receivable candidate set with an owner-scoped partial history page. */
export const mergeReceivableCandidateRows = (
  cachedRows: Expense[],
  incomingRows: Expense[],
  userId: string,
  operations = offlineQueue.getAll(),
): Expense[] => {
  const candidates = new Map<string, Expense>();
  for (const row of cachedRows) {
    if (row?.userId === userId && row.id && hasReceivablePlan(row)) candidates.set(row.id, row);
  }
  for (const row of incomingRows) {
    if (!row || row.userId !== userId || !row.id) continue;
    const previous = candidates.get(row.id);
    if (!preferExpenseVersion(previous, row)) continue;
    if (hasReceivablePlan(row)) candidates.set(row.id, row);
    else candidates.delete(row.id);
  }
  return (applyPendingOperations('receivableExpenses', userId, [...candidates.values()], operations) as Expense[])
    .filter((row) => row?.userId === userId && !!row.id && hasReceivablePlan(row));
};

/** Cached history pages may render against current candidates, but cannot change candidate eligibility. */
export const mergeReceivableCandidatesFromSource = (
  cachedRows: Expense[],
  incomingRows: Expense[],
  userId: string,
  source: NonNullable<ExpenseMergeOptions['incomingSource']>,
  operations = offlineQueue.getAll(),
): Expense[] => source === 'cached'
  ? cachedRows
  : mergeReceivableCandidateRows(cachedRows, incomingRows, userId, operations);

/** Apply the durable local outbox whenever cached or server data becomes visible. */
export const applyPendingOperations = <T>(entity: CacheableEntity, userId: string, data: T, operations = offlineQueue.getAll()): T => {
  const matching: QueuedOperation[] = [];
  for (const operation of operations) {
    const payload = operation.payload as Record<string, unknown> | null;
    if (payload?.userId !== userId) continue;
    if (operation.entity === entities[entity]) matching.push(operation);
    if (entity === 'transfers' && operation.entity === 'expense' && operation.type === 'delete' && Array.isArray(payload.relatedTransferIds)) {
      for (const id of payload.relatedTransferIds) {
        if (typeof id === 'string' && id) matching.push({ ...operation, entity: 'transfer', payload: { id, userId } });
      }
    }
    if ((entity === 'expenses' || entity === 'receivableExpenses') && operation.entity === 'scheduledPaymentRecord' && operation.type === 'create') {
      const expense = payload.generatedExpensePayload as Record<string, unknown> | undefined;
      if (expense?.userId === userId) matching.push({ ...operation, entity: 'expense', payload: expense });
    }
    if ((entity === 'expenses' || entity === 'receivableExpenses') && operation.entity === 'scheduledPaymentRecord' && operation.type !== 'create') {
      const linkedId = payload.generatedExpenseId ?? operation.localSnapshot?.generatedExpenseId;
      if (typeof linkedId === 'string') {
        const fields: Record<string, unknown> = { id: linkedId, userId };
        const names: Record<string, string> = { actualAmount: 'amount', paidDate: 'date', note: 'notes', baseAmount: 'baseAmount', currency: 'currency', baseCurrency: 'baseCurrency', exchangeRate: 'exchangeRate', exchangeRateDate: 'exchangeRateDate', paymentMethod: 'paymentMethod', bankId: 'bankId', cardId: 'cardId', paymentMethodName: 'paymentMethodName' };
        for (const [recordField, expenseField] of Object.entries(names)) if (recordField in payload) fields[expenseField] = payload[recordField];
        matching.push({ ...operation, entity: 'expense', localSnapshot: undefined, payload: fields });
      }
    }
  }

  if (Array.isArray(data)) {
    let result = [...data] as Record<string, unknown>[];
    for (const operation of matching) {
      const payload = operation.payload as Record<string, unknown>;
      const id = payload.id;
      const fields = { ...payload };
      delete fields.id;
      delete fields.expectedRevision;
      delete fields.previousBudget;
      delete fields.generatedExpensePayload;
      if (entity === 'receiptAttachments') delete fields.contentBase64;
      if (typeof id !== 'string' || !id) continue;
      if (entity === 'budgets' && operation.status === 'needs-attention') {
        const previous = payload.previousBudget as Record<string, unknown> | undefined;
        if (operation.type === 'create') result = result.filter((row) => row.id !== id);
        else if (previous) result = [...result.filter((row) => row.id !== id), previous];
        continue;
      }
      if (operation.type === 'create') {
        // An existing server document can already contain newer edits from another device.
        if (!result.some((item) => item.id === id)) result.push({
          ...fields, id, userId,
          createdAt: fields.createdAt || new Date(operation.timestamp),
          updatedAt: fields.updatedAt || new Date(operation.timestamp),
        });
      } else if (operation.type === 'update') {
        if (!result.some((item) => item.id === id) && (operation.localSnapshot || entity === 'friendPreferences')) {
          result.push({ ...operation.localSnapshot, ...fields, id, userId });
        }
        else result = result.map((item) => item.id === id ? { ...item, ...fields, id, userId } : item);
      } else {
        result = result.filter((item) => item.id !== id);
      }
    }
    return result as T;
  }

  let result = data && typeof data === 'object' ? { ...data } as Record<string, unknown> : null;
  for (const operation of matching) {
    const payload = operation.payload as Record<string, unknown>;
    if (!result) result = { ...operation.localSnapshot, id: userId, userId };
    if (entity === 'userSettings') {
      Object.assign(result, payload.updates);
      if (payload.expenseViewChange) result.expenseViewPreferences = applyExpenseViewChange(result.expenseViewPreferences as ExpenseViewPreferences | undefined, payload.expenseViewChange as ExpenseViewChange);
      const incomeLinkChange = payload.incomeLinkedBudgetChange as { config?: unknown; manualMonthlyLimit?: number } | undefined;
      if (incomeLinkChange) {
        result.incomeLinkedBudget = incomeLinkChange.config;
        if (incomeLinkChange.manualMonthlyLimit !== undefined) {
          result.overallBudgetLimits = { ...(result.overallBudgetLimits as Record<string, number> | undefined), monthly: incomeLinkChange.manualMonthlyLimit };
        }
      }
      const desiredLimit = payload.overallBudgetLimit as { period?: string; amount?: number } | undefined;
      const limit = operation.status === 'needs-attention' && desiredLimit
        ? (payload.previousOverallBudgetLimit as { period?: string; amount?: number } | undefined) ?? {
          period: desiredLimit.period,
          amount: (operation.localSnapshot?.overallBudgetLimits as Record<string, number> | undefined)?.[desiredLimit.period ?? ''],
        } : desiredLimit;
      if (limit?.period && ['weekly', 'monthly', 'yearly'].includes(limit.period)) {
        const limits = { ...(result.overallBudgetLimits as Record<string, number> | undefined) };
        if (limit.amount === undefined) delete limits[limit.period];
        else limits[limit.period] = limit.amount;
        result.overallBudgetLimits = limits;
      }
    }
    if (entity === 'dashboardLayout') result.widgets = payload.widgets;
    if (entity === 'featureSettings') {
      const updates = { ...payload };
      delete updates.userId;
      delete updates.reset;
      Object.assign(result, payload.reset
        ? { enabledFeatures: [...DEFAULT_FEATURES], tabFeatures: [...DEFAULT_FEATURES], hamburgerFeatures: [...DEFAULT_FEATURES] }
        : updates);
    }
  }
  return result as T;
};
