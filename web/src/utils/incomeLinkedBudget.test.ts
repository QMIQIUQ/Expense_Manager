import { describe, expect, it } from 'vitest';
import type { Budget, Income, IncomeLinkedBudgetSettings } from '../types';
import { allocationLimitsForSettings, calculateIncomeFunding, DEFAULT_INCOME_LINK, incomeAllocationImpact, incomeBudgetRange, monthlyNetSpendMinor, validIncomeLink } from './incomeLinkedBudget';
import { getPreviousBillingCyclePeriod } from './budgetRollover';

const config: IncomeLinkedBudgetSettings = { ...DEFAULT_INCOME_LINK, enabled: true };
const range = { startDate: '2026-10-01', endDate: '2026-10-31', today: '2026-10-23' };
const income = (id: string, amount: number, extras: Partial<Income> = {}): Income => ({ id, userId: 'u', amount, type: 'salary', date: '2026-10-01', currency: 'MYR', ...extras } as Income);
const budget = (amount: number, extras: Partial<Budget> = {}): Budget => ({ id: 'b', userId: 'u', amount, period: 'monthly', currency: 'MYR', ...extras } as Budget);
describe('income-linked budget funding', () => {
  it('requires confirmation only for increased gaps or unknown impact, and allows reductions', () => {
    const funding = calculateIncomeFunding('u', [income('a', 100)], [], config, range);
    expect(incomeAllocationImpact(5000, 9000, funding)).toEqual({ kind: 'shortfall', shortfallMinor: 1000 });
    expect(incomeAllocationImpact(5000, 7000, funding)).toEqual({ kind: 'none' });
    expect(incomeAllocationImpact(5000, 6000, null)).toEqual({ kind: 'unknown' });
    expect(incomeAllocationImpact(10000, 9000, funding)).toEqual({ kind: 'none' });
    expect(incomeAllocationImpact(10000, 9000, null)).toEqual({ kind: 'none' });
  });
  it('separates actual funding, reserved income, configured allocation and spending', () => {
    expect(calculateIncomeFunding('u', [income('a', 5000)], [budget(1521, { rolloverAmount: 999 })], config, range)).toEqual({
      status: 'ready', incomeMinor: 500000, fundingMinor: 400000, reservedMinor: 100000,
      allocatedMinor: 152100, unallocatedMinor: 247900, shortfallMinor: 0,
    });
  });
  it('shows a shortfall without changing category budgets', () => {
    const budgets = [budget(1000)];
    expect(calculateIncomeFunding('u', [income('a', 100)], budgets, config, range)).toMatchObject({ fundingMinor: 8000, shortfallMinor: 92000, unallocatedMinor: 0 });
    expect(budgets[0].amount).toBe(1000);
  });
  it('uses only eligible ledger rows, deduplicates IDs and excludes future income and reloads', () => {
    const rows = [income('a', 100), income('a', 100), income('b', 1000, { type: 'reimbursement' }), income('c', 50, { type: 'repayment' }),
      income('d', 999, { category: 'ewallet_reload' }), income('e', 999, { date: '2026-10-24' }), income('f', 999, { userId: 'other' }), income('g', 999, { date: '2026-09-30' })];
    expect(calculateIncomeFunding('u', rows, [], config, range)).toMatchObject({ incomeMinor: 10000 });
    expect(calculateIncomeFunding('u', rows, [], { ...config, includeRepayments: true }, range)).toMatchObject({ incomeMinor: 15000 });
    expect(calculateIncomeFunding('u', rows, [], { ...config, includeReimbursements: true }, range)).toMatchObject({ incomeMinor: 110000 });
  });
  it('uses booked MYR amounts and rejects missing foreign valuation or invalid base currency', () => {
    expect(calculateIncomeFunding('u', [income('a', 10, { currency: 'USD', baseCurrency: 'MYR', baseAmount: 45 })], [], config, range)).toMatchObject({ incomeMinor: 4500 });
    for (const extra of [{ currency: 'USD' }, { baseCurrency: 'USD', baseAmount: 10 }, { amount: NaN }, { date: '2026-02-30' }, { amount: -1 }, { amount: Number.MAX_SAFE_INTEGER }]) {
      expect(calculateIncomeFunding('u', [income('a', 10, extra)], [], config, range).status).toBe('invalid');
    }
  });
  it('supports more than one rendered page and rounds percentage once in minor units', () => {
    const rows = Array.from({ length: 205 }, (_, i) => income(String(i), 0.01));
    expect(calculateIncomeFunding('u', rows, [], { ...config, percentage: 33.33 }, range)).toMatchObject({ incomeMinor: 205, fundingMinor: 68 });
    expect(calculateIncomeFunding('u', rows, [], { ...config, percentage: 0 }, range)).toMatchObject({ fundingMinor: 0 });
    expect(calculateIncomeFunding('u', rows, [], { ...config, percentage: 100 }, range)).toMatchObject({ fundingMinor: 205 });
  });
  it('validates configuration and preserves weekly/yearly caps while bypassing monthly enforcement', () => {
    for (const value of [{ ...config, percentage: 1.001 }, { ...config, enabled: 'true' }, { ...config, percentage: Infinity }, { ...config, extra: true }]) expect(validIncomeLink(value)).toBe(false);
    expect(validIncomeLink({ ...config, percentage: 33.33 })).toBe(true);
    const limits = { monthly: 500, weekly: 100, yearly: 6000 };
    expect(allocationLimitsForSettings({ incomeLinkedBudget: config, overallBudgetLimits: limits })).toEqual({ weekly: 100, yearly: 6000 });
    expect(limits.monthly).toBe(500);
    expect(allocationLimitsForSettings({ overallBudgetLimits: limits })).toBe(limits);
  });
  it('clamps 29/30/31 boundaries in February, including the previous cycle', () => {
    for (const day of [29, 30, 31]) {
      expect(incomeBudgetRange(day, new Date(2026, 1, 28))).toEqual({ startDate: '2026-02-28', endDate: `2026-03-${day - 1}`, today: '2026-02-28' });
      const previous = getPreviousBillingCyclePeriod(day, new Date(2026, 1, 28));
      expect(previous.start.getMonth()).toBe(0);
      expect(previous.start.getDate()).toBe(day);
      expect(previous.end.getDate()).toBe(28);
    }
    expect(incomeBudgetRange(31, new Date(2028, 1, 29)).startDate).toBe('2028-02-29');
  });
  it('keeps net spending separate, including categories without allocations', () => {
    expect(monthlyNetSpendMinor('u', [{ id: 'e', userId: 'u', amount: 100, currency: 'MYR', date: '2026-10-01', category: 'No budget' } as never],
      [{ id: 'r', userId: 'u', expenseId: 'e', amount: 30, currency: 'MYR', date: '2026-10-10' } as never], range)).toBe(7000);
  });
});
