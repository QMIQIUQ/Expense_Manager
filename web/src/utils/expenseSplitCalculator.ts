import type { Expense, ExpenseSplitParticipant, Repayment } from '../types';
import { requireCurrencyCode, toMinorUnits, roundMoney } from '../domain/money';
import { getExpenseBaseAmount, getExpenseBaseCurrency, getRepaymentBaseAmount } from './currencyUtils';

const invalid = (message: string): never => { throw Object.assign(new Error(message), { code: 'failed-precondition' }); };
export const validateExpenseSplit = (expense: Pick<Expense, 'amount' | 'currency' | 'splitParticipants'>, previous?: Expense): void => {
  const rows = expense.splitParticipants ?? [];
  if (!Array.isArray(rows) || rows.length > 30) invalid('At most 30 split participants are allowed');
  const currency = requireCurrencyCode(expense.currency);
  const ids = new Set<string>(); let total = 0;
  for (const row of rows) {
    if (typeof row.id !== 'string' || !row.id || row.id.length > 100 || ids.has(row.id) ||
      typeof row.name !== 'string' || !row.name.trim() || row.name.length > 60 || !Number.isSafeInteger(row.owedMinor) || row.owedMinor < 0) invalid('Invalid split participant');
    ids.add(row.id); total += row.owedMinor;
  }
  if (!Number.isSafeInteger(total) || total > toMinorUnits(expense.amount, currency)) invalid('Participant shares exceed the expense amount');
  for (const [id, paid] of Object.entries(previous?.splitPaidMinor ?? {})) {
    if (paid <= 0) continue;
    if (requireCurrencyCode(previous?.currency) !== currency) invalid('Reverse linked split repayments before changing the expense currency');
    if (!rows.some((row) => row.id === id && row.owedMinor >= paid)) invalid('A paid participant cannot be removed or reduced below their settled amount');
  }
  if (Object.values(previous?.splitPaidMinor ?? {}).some((paid) => paid > 0) && JSON.stringify(previous?.splitParticipants ?? []) !== JSON.stringify(rows))
    invalid('Reverse split repayments before changing the participant plan');
};

/** Equal shares include the owner's share. The owner receives the indivisible remainder. */
export const equalExpenseShares = (totalMinor: number, participants: ExpenseSplitParticipant[]): ExpenseSplitParticipant[] => {
  const share = Math.floor(totalMinor / (participants.length + 1));
  return participants.map((participant) => ({ ...participant, owedMinor: share }));
};
export const repaymentsForExpense = (expense: Expense, repayments: Repayment[]): Repayment[] => {
  if (!expense.id || !expense.userId) return [];
  return repayments.filter((repayment) => repayment.expenseId === expense.id && repayment.userId === expense.userId);
};
export const receivableProgress = (expense: Expense, repayments: Repayment[]) => {
  const expectedBase = getExpenseBaseAmount(expense);
  if (!expense.splitParticipants?.length) {
    const actualPaidBase = repaymentsForExpense(expense, repayments).reduce((total, repayment) => total + getRepaymentBaseAmount(repayment), 0);
    const paidBase = Math.min(expectedBase, actualPaidBase);
    const outstandingBase = Math.max(0, expectedBase - paidBase);
    return {
      expectedBase,
      actualPaidBase,
      paidBase,
      outstandingBase,
      expectedRatio: 1,
      outstandingRatio: expectedBase > 0 ? outstandingBase / expectedBase : 0,
      percent: expectedBase > 0 ? Math.max(0, Math.min(100, paidBase / expectedBase * 100)) : 0,
      unassigned: [] as Repayment[],
    };
  }

  const split = summarizeExpenseSplit(expense, repayments);
  const totalMinor = toMinorUnits(expense.amount, split.currency);
  const expectedMinor = split.rows.reduce((total, row) => total + row.owedMinor, 0);
  const outstandingMinor = split.outstandingMinor;
  const actualPaidMinor = split.rows.reduce((total, row) => total + row.paidMinor, 0);
  const expectedRatio = totalMinor > 0 ? expectedMinor / totalMinor : 0;
  const outstandingRatio = totalMinor > 0 ? outstandingMinor / totalMinor : 0;
  const baseCurrency = getExpenseBaseCurrency(expense);
  const expectedBaseForShares = roundMoney(expectedBase * expectedRatio, baseCurrency);
  const outstandingBaseForShares = roundMoney(expectedBase * outstandingRatio, baseCurrency);
  const paidBaseForShares = Math.max(0, expectedBaseForShares - outstandingBaseForShares);
  const actualPaidBaseForShares = totalMinor > 0 ? roundMoney(expectedBase * actualPaidMinor / totalMinor, baseCurrency) : 0;
  return {
    expectedBase: expectedBaseForShares,
    actualPaidBase: actualPaidBaseForShares,
    paidBase: paidBaseForShares,
    outstandingBase: outstandingBaseForShares,
    expectedRatio,
    outstandingRatio,
    percent: expectedMinor > 0 ? Math.max(0, Math.min(100, (expectedMinor - outstandingMinor) / expectedMinor * 100)) : 0,
    unassigned: split.unassigned,
  };
};
export const summarizeExpenseSplit = (expense: Expense, repayments: Repayment[]) => {
  const currency = requireCurrencyCode(expense.currency);
  const linkedRepayments = repaymentsForExpense(expense, repayments);
  const rows = (expense.splitParticipants ?? []).map((participant) => {
    const paidMinor = linkedRepayments.filter((repayment) => repayment.splitParticipantId === participant.id && repayment.settledExpenseCurrency === currency)
      .reduce((total, repayment) => total + (repayment.settledExpenseMinor ?? 0), 0);
    return { ...participant, paidMinor, outstandingMinor: Math.max(0, participant.owedMinor - paidMinor), excessMinor: Math.max(0, paidMinor - participant.owedMinor) };
  });
  return { currency, rows, ownerShareMinor: toMinorUnits(expense.amount, currency) - rows.reduce((total, row) => total + row.owedMinor, 0),
    outstandingMinor: rows.reduce((total, row) => total + row.outstandingMinor, 0),
    unassigned: linkedRepayments.filter((repayment) => !repayment.splitParticipantId) };
};
export const outstandingReceivableBase = (expense: Expense, repayments: Repayment[]): number => {
  return receivableProgress(expense, repayments).outstandingBase;
};
export const hasReceivablePlan = (expense: Expense): boolean => expense.needsRepaymentTracking === true || (expense.splitParticipants?.length ?? 0) > 0;
/**
 * A split remains open until its explicitly assigned shares are settled.
 * Legacy single-total tracking continues to honor its manual completion flag.
 */
export const isOpenReceivable = (expense: Expense, repayments: Repayment[]): boolean => {
  if (!expense.id || !expense.userId) return false;
  if (expense.splitParticipants?.length) return summarizeExpenseSplit(expense, repayments).outstandingMinor > 0;
  return expense.needsRepaymentTracking === true && expense.repaymentTrackingCompleted !== true;
};
export const splitReceivableRatios = (expense: Expense, repayments: Repayment[]) => {
  if (!expense.splitParticipants?.length) return undefined;
  const progress = receivableProgress(expense, repayments);
  return { expected: progress.expectedRatio, outstanding: progress.outstandingRatio };
};
