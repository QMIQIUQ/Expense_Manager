import { doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Expense, Income, Repayment } from '../types';
import type { QueuedOperation } from '../utils/offlineQueue';
import { requireCurrencyCode, toMinorUnits } from '../domain/money';
import { resolveAmountCurrencyFields, convertAmountToCurrency } from './currencyRateService';
import { applyBalanceAdjustmentsInTransaction, bookedAccountMovements, prepareBalanceAdjustments, type BalanceAdjustmentEvent } from './balanceService';
import { runFinancialTransaction } from './financialMutation';

export const prepareRepaymentSettlement = async (input: Partial<Repayment> & Pick<Repayment, 'amount' | 'date'>, expense: Expense, previous?: Repayment): Promise<Partial<Repayment>> => {
  const fields = await resolveAmountCurrencyFields({ amount: input.amount, currency: input.currency || expense.currency || 'MYR', baseCurrency: 'MYR', date: input.date, existing: previous });
  if (!input.splitParticipantId) return { ...fields, splitParticipantId: undefined, settledExpenseCurrency: undefined, settledExpenseMinor: undefined };
  const currency = requireCurrencyCode(expense.currency);
  const unchanged = previous?.splitParticipantId === input.splitParticipantId && previous.amount === input.amount && previous.date === input.date &&
    requireCurrencyCode(previous.currency) === requireCurrencyCode(input.currency || expense.currency) && previous.settledExpenseCurrency === currency;
  const settledExpenseMinor = unchanged && previous?.settledExpenseMinor !== undefined ? previous.settledExpenseMinor
    : toMinorUnits(await convertAmountToCurrency(input.amount, fields.currency, currency, input.date), currency);
  return { ...fields, settledExpenseMinor, settledExpenseCurrency: currency, splitParticipantId: input.splitParticipantId };
};

/** The repayment, per-person counters, account movement and immutable receipt commit together. */
export const commitRepaymentMutation = async (operation: QueuedOperation): Promise<void> => {
  const payload = operation.payload as Partial<Repayment>;
  const userId = payload.userId; const id = payload.id;
  if (!userId || !id) throw Object.assign(new Error('Invalid repayment identity'), { code: 'invalid-argument' });
  const reference = doc(db, 'repayments', id);
  await runFinancialTransaction(db, { userId, operationId: operation.id }, async (transaction) => {
    const current = await transaction.get(reference);
    const previous = current.exists() ? { ...current.data(), id } as Repayment : undefined;
    if (previous && previous.userId !== userId) throw Object.assign(new Error('Repayment owner mismatch'), { code: 'permission-denied' });
    if (operation.type === 'create' && previous || operation.type === 'delete' && !previous) return;
    if (operation.type === 'update' && !previous) throw Object.assign(new Error('Repayment no longer exists'), { code: 'failed-precondition' });
    const next = operation.type === 'delete' ? undefined : { ...previous, ...payload, userId, id, bookedAccountMovements: previous?.bookedAccountMovements } as Repayment;
    const expenseId = previous?.expenseId ?? next?.expenseId;
    if (!expenseId || next && previous && next.expenseId !== previous.expenseId) throw Object.assign(new Error('Repayment expense cannot be changed'), { code: 'invalid-argument' });
    const expenseRef = doc(db, 'expenses', expenseId);
    const expenseSnapshot = await transaction.get(expenseRef);
    const expense = expenseSnapshot.exists() ? { ...expenseSnapshot.data(), id: expenseId } as Expense : undefined;
    if (expense && expense.userId !== userId) throw Object.assign(new Error('Expense owner mismatch'), { code: 'permission-denied' });
    if (next && !expense) throw Object.assign(new Error('Linked expense no longer exists'), { code: 'failed-precondition' });
    const paid = { ...expense?.splitPaidMinor };
    if (previous?.splitParticipantId) {
      const settled = previous.settledExpenseMinor;
      if (!Number.isSafeInteger(settled) || (settled ?? 0) <= 0 || (paid[previous.splitParticipantId] ?? 0) < settled!)
        throw Object.assign(new Error('Split counter is inconsistent; review this repayment before changing it'), { code: 'failed-precondition' });
      paid[previous.splitParticipantId] -= settled!;
      if (paid[previous.splitParticipantId] === 0) delete paid[previous.splitParticipantId];
    }
    if (next) {
      if (!Number.isFinite(next.amount) || next.amount <= 0) throw Object.assign(new Error('Invalid repayment amount'), { code: 'invalid-argument' });
      // Legacy records do not acquire a retroactive account movement on edit.
      next.balanceApplied = previous ? previous.balanceApplied === true : true;
      if (next.splitParticipantId) {
        const participant = expense!.splitParticipants?.find((row) => row.id === next.splitParticipantId);
        const settled = next.settledExpenseMinor;
        if (!participant || !Number.isSafeInteger(settled) || (settled ?? 0) <= 0 || next.settledExpenseCurrency !== requireCurrencyCode(expense!.currency))
          throw Object.assign(new Error('Invalid split settlement'), { code: 'failed-precondition' });
        if (requireCurrencyCode(next.currency) === requireCurrencyCode(expense!.currency) && settled !== toMinorUnits(next.amount, next.currency))
          throw Object.assign(new Error('Native-currency settlement must equal the repayment amount'), { code: 'invalid-argument' });
        paid[participant.id] = (paid[participant.id] ?? 0) + settled!;
        if (paid[participant.id] > participant.owedMinor) throw Object.assign(new Error('Repayment exceeds this participant\'s outstanding share'), { code: 'failed-precondition' });
      }
    }
    const events: BalanceAdjustmentEvent[] = [];
    if (previous?.balanceApplied) events.push({ type: 'income', income: previous as unknown as Income, direction: -1 });
    if (next?.balanceApplied) events.push({ type: 'income', income: next as unknown as Income, direction: 1 });
    const adjustments = await prepareBalanceAdjustments(userId, events);
    await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
    if (next) next.bookedAccountMovements = bookedAccountMovements(adjustments, previous?.balanceApplied ? 1 : 0);
    transaction.set(doc(db, 'repaymentPostingProofs', id), { userId, expenseId, operationId: operation.id,
      beforeApplied: previous?.balanceApplied === true, afterApplied: next?.balanceApplied === true, updatedAt: serverTimestamp() });
    if (expense && (previous?.splitParticipantId || next?.splitParticipantId)) transaction.update(expenseRef, { splitPaidMinor: paid, revision: (expense.revision ?? 0) + 1, splitSettlement: {
      repaymentId: id, operationId: operation.id,
      beforeId: previous?.splitParticipantId ?? '', beforeMinor: previous?.splitParticipantId ? previous.settledExpenseMinor ?? 0 : 0,
      afterId: next?.splitParticipantId ?? '', afterMinor: next?.splitParticipantId ? next.settledExpenseMinor ?? 0 : 0,
      afterIndex: next?.splitParticipantId ? expense.splitParticipants!.findIndex((row) => row.id === next.splitParticipantId) : -1,
    }, updatedAt: Timestamp.now() });
    if (!next) transaction.delete(reference);
    else {
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(next)) if (!['id', 'createdAt', 'updatedAt'].includes(key) && value !== undefined) fields[key] = value;
      const now = Timestamp.now();
      // set replaces optional fields removed by an edit without leaving old participant links.
      transaction.set(reference, { ...fields, createdAt: previous?.createdAt ?? now, updatedAt: now });
    }
  });
};
