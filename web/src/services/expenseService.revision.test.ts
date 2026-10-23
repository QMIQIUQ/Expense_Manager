import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expenseService } from './expenseService';

const mocks = vi.hoisted(() => ({
  hasReceipt: vi.fn(),
  runFinancialTransaction: vi.fn(),
  prepareBalanceAdjustments: vi.fn(),
  applyBalanceAdjustmentsInTransaction: vi.fn(),
  bookedAccountMovements: vi.fn(),
  validateExpenseSplit: vi.fn(),
  applyExpenseSummaryChange: vi.fn(),
  summaryRef: 'summary-state',
  transaction: { get: vi.fn(), update: vi.fn(), set: vi.fn(), delete: vi.fn() },
  expenseData: {} as Record<string, unknown>,
}));

vi.mock('../config/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => args.join('/')),
  doc: vi.fn((...args: unknown[]) => args.slice(1).join('/')),
  getDoc: vi.fn(), getDocFromServer: vi.fn(), getDocs: vi.fn(), getDocsFromServer: vi.fn(),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), Timestamp: { now: () => new Date('2026-10-24T00:00:00Z') },
  deleteField: () => '__delete__',
}));
vi.mock('./financialMutation', () => ({
  hasFinancialReceipt: mocks.hasReceipt,
  runFinancialTransaction: mocks.runFinancialTransaction,
}));
vi.mock('./balanceService', () => ({
  prepareBalanceAdjustments: mocks.prepareBalanceAdjustments,
  applyBalanceAdjustmentsInTransaction: mocks.applyBalanceAdjustmentsInTransaction,
  bookedAccountMovements: mocks.bookedAccountMovements,
}));
vi.mock('../utils/expenseSplitCalculator', () => ({ validateExpenseSplit: mocks.validateExpenseSplit }));
vi.mock('./friendSpendingSummaryService', () => ({
  applyExpenseSummaryChange: mocks.applyExpenseSummaryChange,
  friendSpendingSummaryStateRef: () => mocks.summaryRef,
  isFriendSpendingSummaryReady: () => false,
}));

const expense = {
  id: 'expense-1', userId: 'user-1', description: 'Lunch', amount: 20, category: 'Food', date: '2026-10-24',
  paymentMethod: 'cash', revision: 4,
};

describe('expense revision protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.expenseData = { ...expense };
    mocks.hasReceipt.mockResolvedValue(false);
    mocks.prepareBalanceAdjustments.mockResolvedValue([]);
    mocks.bookedAccountMovements.mockReturnValue([]);
    mocks.transaction.get.mockImplementation(async (ref: string) => ref === 'expenses/expense-1'
      ? { exists: () => true, data: () => mocks.expenseData }
      : { exists: () => false, data: () => undefined });
    mocks.runFinancialTransaction.mockImplementation(async (_db: unknown, _operation: unknown, apply: (transaction: typeof mocks.transaction) => Promise<unknown>) => apply(mocks.transaction));
  });

  it('rejects a stale edit before reading balances or writing anything', async () => {
    await expect(expenseService.update('expense-1', { amount: 30 }, undefined, 3))
      .rejects.toMatchObject({ code: 'failed-precondition', reason: 'expense-version-conflict', message: 'EXPENSE_VERSION_CONFLICT' });

    expect(mocks.prepareBalanceAdjustments).not.toHaveBeenCalled();
    expect(mocks.applyBalanceAdjustmentsInTransaction).not.toHaveBeenCalled();
    expect(mocks.transaction.update).not.toHaveBeenCalled();
  });

  it('increments the revision in the same transaction as a valid edit', async () => {
    await expenseService.update('expense-1', { amount: 30, revision: 99 }, undefined, 4);

    expect(mocks.prepareBalanceAdjustments).toHaveBeenCalledOnce();
    expect(mocks.transaction.update).toHaveBeenCalledWith('expenses/expense-1', expect.objectContaining({ amount: 30, revision: 5 }));
    expect(mocks.transaction.update.mock.calls[0][1]).not.toHaveProperty('revision', 99);
  });
});
