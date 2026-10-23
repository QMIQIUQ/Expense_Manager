import { DEFAULT_FEATURES } from '../types';
import { offlineQueue, type QueuedOperation } from './offlineQueue';
import type { CacheableEntity } from './sessionCache';
import { applyExpenseViewChange, type ExpenseViewChange } from './expenseViewPreferences';
import type { ExpenseViewPreferences } from '../types/expensePeriod';

const entities: Record<CacheableEntity, QueuedOperation['entity']> = {
  expenses: 'expense', categories: 'category', budgets: 'budget', recurring: 'recurring',
  incomes: 'income', cards: 'card', banks: 'bank', ewallets: 'ewallet', repayments: 'repayment',
  transfers: 'transfer', scheduledPayments: 'scheduledPayment', scheduledPaymentRecords: 'scheduledPaymentRecord',
  quickExpensePresets: 'quickExpensePreset', featureSettings: 'featureSettings', userSettings: 'userSettings',
  friendPreferences: 'friendPreference',
  dashboardLayout: 'dashboardLayout',
  expenseTags: 'expenseTag',
};
export const cacheEntityFor = (entity: QueuedOperation['entity']): CacheableEntity =>
  (Object.keys(entities) as CacheableEntity[]).find((key) => entities[key] === entity)!;

/** Apply the durable local outbox whenever cached or server data becomes visible. */
export const applyPendingOperations = <T>(entity: CacheableEntity, userId: string, data: T, operations = offlineQueue.getAll()): T => {
  const matching: QueuedOperation[] = [];
  for (const operation of operations) {
    const payload = operation.payload as Record<string, unknown> | null;
    if (payload?.userId !== userId) continue;
    if (operation.entity === entities[entity]) matching.push(operation);
    if (entity === 'expenses' && operation.entity === 'scheduledPaymentRecord' && operation.type === 'create') {
      const expense = payload.generatedExpensePayload as Record<string, unknown> | undefined;
      if (expense?.userId === userId) matching.push({ ...operation, entity: 'expense', payload: expense });
    }
    if (entity === 'expenses' && operation.entity === 'scheduledPaymentRecord' && operation.type !== 'create') {
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
      delete fields.previousBudget;
      delete fields.generatedExpensePayload;
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
