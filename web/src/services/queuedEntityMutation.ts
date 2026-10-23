import { doc, deleteField, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { QueuedOperation } from '../utils/offlineQueue';
import { runFinancialTransaction } from './financialMutation';
import { commitTagMutation } from './tagMutation';
import { commitRepaymentMutation } from './splitSettlementService';
import { commitReconciliationMutation } from './accountReconciliationService';

const collectionFor = {
  bank: 'banks', ewallet: 'ewallets', card: 'cards', category: 'categories', repayment: 'repayments',
  recurring: 'recurringExpenses', scheduledPayment: 'scheduledPayments', quickExpensePreset: 'quickExpensePresets',
  scheduledPaymentRecord: 'scheduledPaymentRecords',
  expenseTag: 'expenseTags',
} as const;
export type QueuedEntity = keyof typeof collectionFor;

/** Generic document writes share the same immutable replay receipt as financial writes. */
export const commitQueuedEntity = async (operation: QueuedOperation): Promise<void> => {
  if (operation.entity === 'expenseTag') return commitTagMutation(operation);
  if (operation.entity === 'repayment') return commitRepaymentMutation(operation);
  if (operation.entity === 'accountReconciliation' || operation.entity === 'reconciliationMark') return commitReconciliationMutation(operation);
  const payload = operation.payload as Record<string, unknown>;
  if (typeof payload.id !== 'string' || typeof payload.userId !== 'string') throw Object.assign(new Error('Invalid queued document identity'), { code: 'invalid-argument' });
  const collectionName = collectionFor[operation.entity as QueuedEntity];
  if (!collectionName) throw new Error('Unsupported queued entity');
  const reference = doc(db, collectionName, payload.id);
  await runFinancialTransaction(db, { userId: payload.userId, operationId: operation.id }, async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists() && existing.data().userId !== payload.userId) throw Object.assign(new Error('Document is owned by another user'), { code: 'permission-denied' });
    if (operation.type === 'delete') {
      if (existing.exists()) transaction.delete(reference);
      return;
    }
    if (operation.type === 'create' && existing.exists()) return;
    if (operation.type === 'update' && !existing.exists()) throw Object.assign(new Error('Document no longer exists'), { code: 'failed-precondition' });
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (['id', 'userId', 'createdAt', 'updatedAt', 'previousBudget', 'previousExpense', 'generatedExpensePayload'].includes(key)) continue;
      if (value !== undefined) fields[key] = value;
      else if (operation.type === 'update') fields[key] = deleteField();
    }
    const now = Timestamp.now();
    if (operation.type === 'create') {
      if (operation.entity === 'bank' || operation.entity === 'ewallet') fields.balance ??= 0;
      transaction.set(reference, { ...fields, userId: payload.userId, createdAt: now, updatedAt: now });
    } else transaction.update(reference, { ...fields, updatedAt: now });
  });
};
