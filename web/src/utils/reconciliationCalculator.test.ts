import { describe, expect, it, vi } from 'vitest';
import type { Expense, Income, Repayment, Transfer } from '../types';
import type { FinancialPeriod } from '../services/financialPeriodService';
import { bookedMovementSource } from './bookedMovementSource';
import { calculateReconciliationMovements } from './reconciliationCalculator';
const period = { range: { startDate: '2026-10-01', endDate: '2026-10-31' }, expenses: [], incomes: [], repayments: [], transfers: [] } as FinancialPeriod;
describe('account statement movement directions', () => {
  it('counts bank receipts and expenses in their native currency using booked valuation', async () => {
    const data = { ...period,
      expenses: [{ id: 'expense', amount: 10, currency: 'USD', baseAmount: 45, baseCurrency: 'MYR', date: '2026-10-01', paymentMethod: 'bank', bankId: 'bank' }] as Expense[],
      incomes: [{ id: 'income', amount: 100, date: '2026-10-01', paymentMethod: 'bank', bankId: 'bank' }] as Income[],
      repayments: [{ id: 'repay', balanceApplied: true, amount: 20, date: '2026-10-01', paymentMethod: 'bank', bankId: 'bank' }] as Repayment[] };
    const convert = vi.fn();
    const rows = await calculateReconciliationMovements({ type: 'bank', id: 'bank', name: 'Bank', currency: 'MYR' }, data, convert);
    expect(rows.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(7500); expect(convert).not.toHaveBeenCalled();
  });
  it('reverses credit-card directions and avoids double-counting an explicitly linked source', async () => {
    const data = { ...period,
      expenses: [{ id: 'expense', amount: 100, date: '2026-10-01', paymentMethod: 'credit_card', cardId: 'card' }] as Expense[],
      transfers: [{ id: 'reload', expenseId: 'expense', amount: 100, date: '2026-10-01', fromPaymentMethod: 'credit_card', fromCardId: 'card', toPaymentMethod: 'e_wallet', toPaymentMethodName: 'Wallet' },
        { id: 'payment', amount: 30, date: '2026-10-02', fromPaymentMethod: 'bank', fromBankId: 'bank', toPaymentMethod: 'credit_card', toCardId: 'card' }] as Transfer[] };
    const card = await calculateReconciliationMovements({ type: 'credit_card', id: 'card', name: 'Card', currency: 'MYR' }, data, vi.fn());
    expect(card.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(7000); expect(card).toHaveLength(2);
    const wallet = await calculateReconciliationMovements({ type: 'e_wallet', id: 'wallet', name: 'Wallet', currency: 'MYR' }, data, vi.fn());
    expect(wallet[0].deltaMinor).toBe(10000);
  });
});

it('uses immutable account-currency booking and refuses unknown legacy cross-currency values', async () => {
  const account = { type: 'bank' as const, id: 'sgd', name: 'SGD bank', currency: 'SGD' };
  const row = { id: 'e', userId: 'u', description: 'USD purchase', paymentMethod: 'bank', bankId: 'sgd', date: '2026-03-01', amount: 10, currency: 'USD', baseAmount: 45, baseCurrency: 'MYR',
    bookedAccountMovements: [{ role: 'expense', accountType: 'bank', accountId: 'sgd', currency: 'SGD', amountMinor: 1350, source: bookedMovementSource({ method: 'bank', accountId: 'sgd', amount: 10, currency: 'USD', baseAmount: 45, baseCurrency: 'MYR', date: '2026-03-01' }) }] } as Expense;
  const convert = vi.fn().mockResolvedValue(9999);
  const rows = await calculateReconciliationMovements(account, { ...period, expenses: [row] }, convert);
  expect(rows[0].deltaMinor).toBe(-1350); expect(convert).not.toHaveBeenCalled();
  await expect(calculateReconciliationMovements(account, { ...period, expenses: [{ ...row, bookedAccountMovements: undefined }] }, convert)).rejects.toThrow('original account-currency');
  expect(convert).not.toHaveBeenCalled();
});

it('keeps legacy bank/wallet settlements at zero account delta and retains separately posted legacy excess income', async () => {
  const account = { type: 'bank' as const, id: 'bank', name: 'Bank', currency: 'MYR' };
  const repayment = { id: 'legacy', userId: 'u', expenseId: 'expense', amount: 150, date: '2026-10-01', paymentMethod: 'bank', bankId: 'bank' } as Repayment;
  const excess = { id: 'excess', userId: 'u', linkedExpenseId: 'expense', type: 'repayment', amount: 50, date: '2026-10-01', paymentMethod: 'bank', bankId: 'bank', note: 'Automatically created from excess repayment' } as Income;
  const rows = await calculateReconciliationMovements(account, { ...period, repayments: [repayment], incomes: [excess] }, vi.fn());
  expect(rows.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(5000);
  expect(rows.find((row) => row.key === 'repayment:legacy')).toMatchObject({ deltaMinor: 0, reviewReason: 'legacy-unposted-repayment', reviewAmountMinor: 15000 });
  const wallet = await calculateReconciliationMovements({ type: 'e_wallet', id: 'wallet', name: 'Wallet', currency: 'MYR' }, { ...period, repayments: [{ ...repayment, paymentMethod: 'e_wallet', paymentMethodName: 'Wallet', balanceApplied: false }] }, vi.fn());
  expect(wallet[0]).toMatchObject({ deltaMinor: 0, reviewReason: 'legacy-unposted-repayment' });
});

it('counts independently posted legacy excess income and later modern receipts on the same expense', async () => {
  const base = { userId: 'u', expenseId: 'expense', date: '2026-10-01', currency: 'MYR', paymentMethod: 'bank', bankId: 'bank' };
  const data = { ...period,
    repayments: [{ ...base, id: 'old', amount: 150 }, { ...base, id: 'new', amount: 20, balanceApplied: true }] as Repayment[],
    incomes: [{ ...base, id: 'excess', amount: 50, type: 'repayment', linkedExpenseId: 'expense', note: 'Automatically created from excess repayment' }] as Income[] };
  const rows = await calculateReconciliationMovements({ type: 'bank', id: 'bank', name: 'Bank', currency: 'MYR' }, data, vi.fn());
  expect(rows.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(7000);
  expect(rows.find((row) => row.key === 'repayment:old')).toMatchObject({ deltaMinor: 0, reviewReason: 'legacy-unposted-repayment' });
});
it('keeps two independently booked expense and transfer account debits instead of guessing a duplicate', async () => {
  const data = { ...period,
    expenses: [{ id: 'e', amount: 10, currency: 'MYR', date: '2026-10-01', paymentMethod: 'bank', bankId: 'b', bookedAccountMovements: [] }] as Expense[],
    transfers: [{ id: 't', expenseId: 'e', amount: 10, currency: 'MYR', date: '2026-10-01', fromPaymentMethod: 'bank', fromBankId: 'b', toPaymentMethod: 'cash', bookedAccountMovements: [] }] as Transfer[] };
  const rows = await calculateReconciliationMovements({ type: 'bank', id: 'b', name: 'Bank', currency: 'MYR' }, data, vi.fn());
  expect(rows.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(-2000);
});
