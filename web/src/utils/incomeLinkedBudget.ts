import type { Budget, Expense, Income, IncomeLinkedBudgetSettings, OverallBudgetLimits, Repayment, UserSettings } from '../types';
import { getAllocatedBudgetMinorUnits } from './budgetAllocation';
import { CURRENCIES, getExpenseBaseAmount, getIncomeBaseAmount, getRepaymentBaseAmount } from './currencyUtils';
import { getBillingCyclePeriod } from './budgetRollover';
import { formatDateLocal } from './dateUtils';

export const DEFAULT_INCOME_LINK: IncomeLinkedBudgetSettings = {
  version: 1, enabled: false, percentage: 80, includeReimbursements: false, includeRepayments: false,
};

export const validIncomeLink = (value: unknown): value is IncomeLinkedBudgetSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 5 && v.version === 1 && typeof v.enabled === 'boolean' &&
    typeof v.includeReimbursements === 'boolean' && typeof v.includeRepayments === 'boolean' &&
    typeof v.percentage === 'number' && Number.isFinite(v.percentage) && v.percentage >= 0 && v.percentage <= 100 &&
    Math.abs(v.percentage * 100 - Math.round(v.percentage * 100)) < 1e-8;
};

export const incomeLinkEnabled = (value: unknown): boolean => validIncomeLink(value) && value.enabled;

/** A linked monthly allocation never consumes or increases the saved manual limit. */
export const allocationLimitsForSettings = (settings: Pick<UserSettings, 'overallBudgetLimits' | 'incomeLinkedBudget'> | null | undefined): OverallBudgetLimits | undefined => {
  const limits = settings?.overallBudgetLimits;
  if (!incomeLinkEnabled(settings?.incomeLinkedBudget)) return limits;
  const result = { ...limits };
  delete result.monthly;
  return result;
};

export interface IncomeBudgetRange { startDate: string; endDate: string; today: string }
export const incomeBudgetRange = (billingCycleDay: number, now = new Date()): IncomeBudgetRange => {
  const { start, end } = getBillingCyclePeriod(billingCycleDay, now);
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  return { startDate: formatDateLocal(start), endDate: formatDateLocal(last), today: formatDateLocal(now) };
};
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  formatDateLocal(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))) === date;
const minor = (amount: number): number | null => {
  const value = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(value) ? value : null;
};

export type IncomeFunding = { status: 'invalid'; reason: 'configuration' | 'income' | 'allocation' } | {
  status: 'ready'; incomeMinor: number; fundingMinor: number; reservedMinor: number;
  allocatedMinor: number; unallocatedMinor: number; shortfallMinor: number;
};

/** Reductions stay available even when the complete income scope is unavailable. */
export function incomeAllocationImpact(beforeMinor: number, afterMinor: number, funding: IncomeFunding | null):
  { kind: 'none' } | { kind: 'unknown' } | { kind: 'shortfall'; shortfallMinor: number } {
  if (afterMinor <= beforeMinor) return { kind: 'none' };
  if (!funding || funding.status !== 'ready') return { kind: 'unknown' };
  return afterMinor <= funding.fundingMinor ? { kind: 'none' }
    : { kind: 'shortfall', shortfallMinor: afterMinor - funding.fundingMinor };
}

export function calculateIncomeFunding(
  userId: string, incomes: Income[], budgets: Budget[], settings: IncomeLinkedBudgetSettings, range: IncomeBudgetRange,
): IncomeFunding {
  if (!validIncomeLink(settings)) return { status: 'invalid', reason: 'configuration' };
  const allocated = getAllocatedBudgetMinorUnits(budgets.filter((budget) => budget.userId === userId), 'monthly');
  if (allocated === null || !Number.isSafeInteger(allocated) || allocated < 0) return { status: 'invalid', reason: 'allocation' };
  const seen = new Set<string>();
  let incomeMinor = 0;
  for (const income of incomes) {
    if (income.userId !== userId) continue;
    if (!income.id || !validDate(income.date)) return { status: 'invalid', reason: 'income' };
    if (seen.has(income.id)) continue;
    seen.add(income.id);
    if (income.date < range.startDate || income.date > range.endDate || income.date > range.today || income.category === 'ewallet_reload') continue;
    const eligible = income.type === 'salary' || income.type === 'other' ||
      income.type === 'reimbursement' && settings.includeReimbursements || income.type === 'repayment' && settings.includeRepayments;
    if (!eligible) continue;
    // Booked base values must really be MYR; never reinterpret another base currency.
    if (income.baseCurrency && income.baseCurrency !== 'MYR' || income.currency && !CURRENCIES.some((currency) => currency.code === income.currency)) return { status: 'invalid', reason: 'income' };
    const value = minor(getIncomeBaseAmount(income));
    if (value === null || !Number.isSafeInteger(incomeMinor + value)) return { status: 'invalid', reason: 'income' };
    incomeMinor += value;
  }
  const basisPoints = Math.round(settings.percentage * 100);
  const fundingMinor = Number((BigInt(incomeMinor) * BigInt(basisPoints) + 5000n) / 10000n);
  return { status: 'ready', incomeMinor, fundingMinor, reservedMinor: incomeMinor - fundingMinor, allocatedMinor: allocated,
    unallocatedMinor: Math.max(0, fundingMinor - allocated), shortfallMinor: Math.max(0, allocated - fundingMinor) };
}

/** Net spending is separate from allocation, and includes categories without a budget. */
export function monthlyNetSpendMinor(userId: string, expenses: Expense[], repayments: Repayment[], range: IncomeBudgetRange): number | null {
  const relevant = expenses.filter((expense) => expense.userId === userId && expense.date >= range.startDate && expense.date <= range.endDate && expense.date <= range.today);
  const expenseIds = new Set(relevant.map((expense) => expense.id));
  const recovered = new Map<string, number>();
  const seenRepayments = new Set<string>();
  for (const repayment of repayments) {
    if (repayment.userId !== userId || repayment.date > range.today || !expenseIds.has(repayment.expenseId)) continue;
    if (!validDate(repayment.date) || !repayment.id) return null;
    if (seenRepayments.has(repayment.id)) continue;
    seenRepayments.add(repayment.id);
    const value = minor(getRepaymentBaseAmount(repayment));
    if (repayment.baseCurrency && repayment.baseCurrency !== 'MYR' || value === null) return null;
    const sum = (recovered.get(repayment.expenseId) ?? 0) + value;
    if (!Number.isSafeInteger(sum)) return null;
    recovered.set(repayment.expenseId, sum);
  }
  let total = 0;
  const seenExpenses = new Set<string>();
  for (const expense of relevant) {
    if (!expense.id) return null;
    if (seenExpenses.has(expense.id)) continue;
    seenExpenses.add(expense.id);
    const value = minor(getExpenseBaseAmount(expense));
    if (!validDate(expense.date) || expense.baseCurrency && expense.baseCurrency !== 'MYR' || value === null) return null;
    total += Math.max(0, value - (recovered.get(expense.id ?? '') ?? 0));
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}
