import type { QueuedOperation } from './offlineQueue';

/** Shared documents and referenced accounts form ordering dependencies. */
export const dependencyKeys = (operation: Pick<QueuedOperation, 'entity' | 'payload'> & { dependencies?: string[] }): Set<string> => {
  const payload = operation.payload as Record<string, unknown> | null;
  const keys = new Set<string>(operation.dependencies);
  if (!payload) return keys;
  const owner = String(payload.userId ?? '');
  const add = (kind: string, id: unknown) => { if (typeof id === 'string' && id) keys.add(`${owner}:${kind}:${id}`); };
  add(operation.entity, payload.id ?? owner);
  if (operation.entity === 'budget' || (operation.entity === 'userSettings' && ('incomeLinkedBudgetChange' in payload || 'overallBudgetLimit' in payload || 'overallBudgetLimits' in (payload.updates as object ?? {})))) keys.add(`${owner}:budget-allocation`);
  const visit = (data: Record<string, unknown>) => {
    for (const field of ['bankId', 'fromBankId', 'toBankId']) add('bank', data[field]);
    for (const field of ['cardId', 'fromCardId', 'toCardId']) add('card', data[field]);
    for (const field of ['paymentMethodName', 'fromPaymentMethodName', 'toPaymentMethodName']) add('ewallet-name', data[field]);
    add('category', data.categoryId);
    add('expense', data.expenseId);
    add('accountReconciliation', data.reconciliationId);
    if (data.accountType === 'bank') add('bank', data.accountId);
    if (data.accountType === 'credit_card') add('card', data.accountId);
    if (data.accountType === 'e_wallet') { add('ewallet', data.accountId); add('ewallet-name', data.accountName); }
    add('expense', data.generatedExpenseId);
    add('scheduledPaymentRecord', data.scheduledPaymentRecordId);
    add('scheduledPayment', data.scheduledPaymentId);
    add('category-name', data.category);
    if (Array.isArray(data.tagIds)) data.tagIds.forEach((id) => add('expenseTag', id));
    if (Array.isArray(data.relatedTransferIds)) data.relatedTransferIds.forEach((id) => add('transfer', id));
  };
  visit(payload);
  for (const field of ['updates', 'previousExpense', 'previousBudget', 'generatedExpensePayload']) {
    const nested = payload[field];
    if (nested && typeof nested === 'object') {
      visit(nested as Record<string, unknown>);
      if (field === 'generatedExpensePayload') add('expense', (nested as Record<string, unknown>).id);
    }
  }
  if (operation.entity === 'category') {
    add('category-name', payload.name);
    add('category-name', (payload.updates as Record<string, unknown> | undefined)?.name);
  }
  if (operation.entity === 'ewallet') add('ewallet-name', payload.name);
  return keys;
};

export const operationsOverlap = (first: Pick<QueuedOperation, 'entity' | 'payload'> & { dependencies?: string[] }, second: Pick<QueuedOperation, 'entity' | 'payload'> & { dependencies?: string[] }): boolean => {
  const firstOwner = (first.payload as { userId?: string } | null)?.userId;
  const secondOwner = (second.payload as { userId?: string } | null)?.userId;
  const reconciliation = ['accountReconciliation', 'reconciliationMark'];
  const financial = ['expense', 'income', 'repayment', 'transfer', 'scheduledPaymentRecord'];
  if (firstOwner && firstOwner === secondOwner &&
    (reconciliation.includes(first.entity) && financial.includes(second.entity) || reconciliation.includes(second.entity) && financial.includes(first.entity))) return true;
  const left = dependencyKeys(first);
  return [...dependencyKeys(second)].some((key) => left.has(key));
};
