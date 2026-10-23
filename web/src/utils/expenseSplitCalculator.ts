import type { Expense, ExpenseSplitParticipant, Repayment } from '../types';
import { fromMinorUnits, requireCurrencyCode, toMinorUnits, roundMoney } from '../domain/money';
import { getExpenseBaseAmount, getRepaymentBaseAmount } from './currencyUtils';

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
export const summarizeExpenseSplit = (expense: Expense, repayments: Repayment[]) => {
  const currency = requireCurrencyCode(expense.currency);
  const rows = (expense.splitParticipants ?? []).map((participant) => {
    const paidMinor = repayments.filter((repayment) => repayment.expenseId === expense.id && repayment.userId === expense.userId &&
      repayment.splitParticipantId === participant.id && repayment.settledExpenseCurrency === currency)
      .reduce((total, repayment) => total + (repayment.settledExpenseMinor ?? 0), 0);
    return { ...participant, paidMinor, outstandingMinor: Math.max(0, participant.owedMinor - paidMinor), excessMinor: Math.max(0, paidMinor - participant.owedMinor) };
  });
  return { currency, rows, ownerShareMinor: toMinorUnits(expense.amount, currency) - rows.reduce((total, row) => total + row.owedMinor, 0),
    outstandingMinor: rows.reduce((total, row) => total + row.outstandingMinor, 0),
    unassigned: repayments.filter((repayment) => repayment.expenseId === expense.id && !repayment.splitParticipantId) };
};
export const outstandingReceivableBase = (expense: Expense, repayments: Repayment[]): number => {
  if (!expense.splitParticipants?.length) return Math.max(0, getExpenseBaseAmount(expense) - repayments.filter((row) => row.expenseId === expense.id).reduce((sum, row) => sum + getRepaymentBaseAmount(row), 0));
  const split = summarizeExpenseSplit(expense, repayments);
  return expense.amount > 0 ? roundMoney(fromMinorUnits(split.outstandingMinor, split.currency) * getExpenseBaseAmount(expense) / expense.amount, 'MYR') : 0;
};
export const splitReceivableRatios = (expense: Expense, repayments: Repayment[]) => {
  if (!expense.splitParticipants?.length) return undefined;
  const split = summarizeExpenseSplit(expense, repayments);
  const total = toMinorUnits(expense.amount, expense.currency);
  return { expected: total > 0 ? split.rows.reduce((sum, row) => sum + row.owedMinor, 0) / total : 0,
    outstanding: total > 0 ? split.outstandingMinor / total : 0 };
};
