import { describe, expect, it } from 'vitest';
import type { Expense, Repayment } from '../types';
import { equalExpenseShares, outstandingReceivableBase, summarizeExpenseSplit, validateExpenseSplit } from './expenseSplitCalculator';
const expense = { id: 'meal', userId: 'owner', amount: 120, currency: 'MYR', baseAmount: 120,
  splitParticipants: [{ id: 'a', name: 'A', owedMinor: 4000 }, { id: 'b', name: 'B', owedMinor: 4000 }] } as Expense;
describe('receivables exclude the owner share', () => {
  it('tracks each person and preserves unassigned legacy receipts without guessing names', () => {
    const repayments = [{ id: 'paid', userId: 'owner', expenseId: 'meal', splitParticipantId: 'a', settledExpenseMinor: 2000, settledExpenseCurrency: 'MYR', amount: 20 },
      { id: 'legacy', userId: 'owner', expenseId: 'meal', payerName: 'B', amount: 10 }] as Repayment[];
    const result = summarizeExpenseSplit(expense, repayments);
    expect(result.ownerShareMinor).toBe(4000); expect(result.outstandingMinor).toBe(6000); expect(result.unassigned).toHaveLength(1);
    expect(outstandingReceivableBase(expense, repayments)).toBe(60);
  });
  it('assigns indivisible equal-split remainder to the owner, including zero-digit currencies', () => {
    expect(equalExpenseShares(100, expense.splitParticipants!).map((row) => row.owedMinor)).toEqual([33, 33]);
    expect(equalExpenseShares(1, expense.splitParticipants!).map((row) => row.owedMinor)).toEqual([0, 0]);
  });
  it('rejects over-allocation, duplicate identities and orphaning a settled participant', () => {
    expect(() => validateExpenseSplit({ ...expense, amount: 50 })).toThrow('exceed');
    expect(() => validateExpenseSplit({ ...expense, splitParticipants: [expense.splitParticipants![0], expense.splitParticipants![0]] })).toThrow('Invalid');
    expect(() => validateExpenseSplit({ ...expense, splitParticipants: [] }, { ...expense, splitPaidMinor: { a: 1000 } })).toThrow('paid participant');
    expect(() => validateExpenseSplit({ ...expense, currency: 'USD' }, { ...expense, splitPaidMinor: { a: 1000 } })).toThrow('currency');
  });
});
