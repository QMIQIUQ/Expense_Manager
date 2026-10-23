import { describe, expect, it } from 'vitest';
import type { Expense, Repayment } from '../types';
import { equalExpenseShares, isOpenReceivable, outstandingReceivableBase, receivableProgress, summarizeExpenseSplit, validateExpenseSplit } from './expenseSplitCalculator';
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
  it('scopes repayments to the stable expense owner and ID', () => {
    const unrelated = [{ id: 'foreign', userId: 'another-owner', expenseId: 'meal', amount: 120,
      splitParticipantId: 'a', settledExpenseMinor: 4000, settledExpenseCurrency: 'MYR' }] as Repayment[];
    expect(summarizeExpenseSplit(expense, unrelated).outstandingMinor).toBe(8000);
    expect(summarizeExpenseSplit(expense, unrelated).unassigned).toHaveLength(0);
    expect(outstandingReceivableBase(expense, unrelated)).toBe(80);
    expect(outstandingReceivableBase({ ...expense, id: undefined }, unrelated)).toBe(80);
    expect(outstandingReceivableBase({ ...expense, splitParticipants: [], needsRepaymentTracking: true }, unrelated)).toBe(120);
  });
  it('caps manual progress at 100 percent and ignores another owner with the same expense ID', () => {
    const receipts = [
      { id: 'mine', userId: 'owner', expenseId: 'meal', amount: 150 },
      { id: 'foreign', userId: 'another-owner', expenseId: 'meal', amount: 900 },
    ] as Repayment[];
    const manual = { ...expense, splitParticipants: [], needsRepaymentTracking: true };
    expect(receivableProgress(manual, receipts)).toMatchObject({ expectedBase: 120, actualPaidBase: 150, paidBase: 120, outstandingBase: 0, percent: 100 });
    expect(outstandingReceivableBase(manual, receipts)).toBe(0);
  });
  it('does not count unassigned payments toward a split participant progress bar', () => {
    const progress = receivableProgress(expense, [
      { id: 'assigned', userId: 'owner', expenseId: 'meal', splitParticipantId: 'a', settledExpenseMinor: 2000, settledExpenseCurrency: 'MYR', amount: 20 },
      { id: 'unassigned', userId: 'owner', expenseId: 'meal', amount: 100 },
    ] as Repayment[]);
    expect(progress).toMatchObject({ expectedBase: 80, paidBase: 20, outstandingBase: 60, percent: 25 });
    expect(progress.unassigned).toHaveLength(1);
  });
  it('caps split progress while keeping actual excess payments available to the details', () => {
    const progress = receivableProgress(expense, [
      { id: 'excess', userId: 'owner', expenseId: 'meal', splitParticipantId: 'a', settledExpenseMinor: 5000, settledExpenseCurrency: 'MYR', amount: 50 },
    ] as Repayment[]);
    expect(progress).toMatchObject({ expectedBase: 80, actualPaidBase: 50, paidBase: 40, outstandingBase: 40, percent: 50 });
    expect(summarizeExpenseSplit(expense, [{ id: 'excess', userId: 'owner', expenseId: 'meal', splitParticipantId: 'a', settledExpenseMinor: 5000, settledExpenseCurrency: 'MYR', amount: 50 }] as Repayment[]).rows[0].excessMinor).toBe(1000);
  });
  it('keeps split balances open until assigned shares settle while preserving manual completion', () => {
    const legacySplit = { ...expense, needsRepaymentTracking: false, repaymentTrackingCompleted: true };
    expect(isOpenReceivable(legacySplit, [])).toBe(true);
    expect(isOpenReceivable(legacySplit, [{ id: 'paid-a', userId: 'owner', expenseId: 'meal', amount: 40,
      splitParticipantId: 'a', settledExpenseMinor: 4000, settledExpenseCurrency: 'MYR' }] as Repayment[])).toBe(true);
    expect(isOpenReceivable(legacySplit, [
      { id: 'paid-a', userId: 'owner', expenseId: 'meal', amount: 40, splitParticipantId: 'a', settledExpenseMinor: 4000, settledExpenseCurrency: 'MYR' },
      { id: 'paid-b', userId: 'owner', expenseId: 'meal', amount: 40, splitParticipantId: 'b', settledExpenseMinor: 4000, settledExpenseCurrency: 'MYR' },
    ] as Repayment[])).toBe(false);
    expect(isOpenReceivable({ ...expense, splitParticipants: [], needsRepaymentTracking: true, repaymentTrackingCompleted: true }, [])).toBe(false);
    expect(isOpenReceivable({ ...expense, splitParticipants: [], needsRepaymentTracking: true, repaymentTrackingCompleted: false }, [])).toBe(true);
    expect(isOpenReceivable({ ...expense, splitParticipants: [], needsRepaymentTracking: true, repaymentTrackingCompleted: false },
      [{ id: 'paid-all', userId: 'owner', expenseId: 'meal', amount: 120 }] as Repayment[])).toBe(true);
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
