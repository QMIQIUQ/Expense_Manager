import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Budget, Expense, Income } from '../types';
import { calculateBudgetSpending } from './budgetNotifications';
import { calculateBudgetSuggestions } from './budgetSuggestions';
import { getSpendingHistory } from './budgetAnalysis';
import { DEFAULT_INCOME_LINK, calculateIncomeFunding, incomeBudgetRange } from './incomeLinkedBudget';
import { getBillingCyclePeriod, getPreviousBillingCyclePeriod } from './budgetRollover';
import { formatDateLocal } from './dateUtils';
import { getBillingCycleRange } from '../components/dashboard/widgets/utils';
import BudgetHistory from '../components/budgets/BudgetHistory';
import SummaryCardsWidget from '../components/dashboard/widgets/SummaryCardsWidget';
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useCurrencyConversionMap', () => ({ useCurrencyConversionMap: () => ({}) }));
afterEach(() => vi.useRealTimers());
describe('shared monthly billing boundaries across budgets and dashboard', () => {
  it.each([
    ['2026-02-28', '2026-02-28', '2026-01-31'],
    ['2028-02-29', '2028-02-29', '2028-01-31'],
    ['2026-10-23', '2026-09-30', '2026-08-31'],
    ['2027-01-10', '2026-12-31', '2026-11-30'],
  ])('uses one calendar cycle on %s with billing day 31', (today, startDate, previousStart) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(today + 'T12:00:00'));
    const current = getBillingCyclePeriod(31);
    const previous = getPreviousBillingCyclePeriod(31);
    expect(formatDateLocal(current.start)).toBe(startDate);
    expect(formatDateLocal(previous.start)).toBe(previousStart);
    expect(incomeBudgetRange(31).startDate).toBe(startDate);
    expect(getBillingCycleRange(31).cycleStart.toISOString().slice(0, 10)).toBe(startDate);
    const last = new Date(current.start); last.setDate(last.getDate() - 1);
    const expense = (id: string, date: string, amount: number): Expense => ({ id, userId: 'u', description: 'Cycle test', category: 'Food', currency: 'MYR', amount, date } as Expense);
    const expenses = [expense('a', previousStart, 11), expense('b', formatDateLocal(last), 22), expense('c', startDate, 44)];
    const budget = { id: 'budget', userId: 'u', categoryName: 'Food', period: 'monthly', amount: 1000, startDate: previousStart, currency: 'MYR' } as Budget;
    expect(calculateBudgetSpending(budget, expenses, 31)).toBe(44);
    expect(calculateBudgetSuggestions(expenses, [], 'Food', 31, 1)?.averageSpending).toBe(33);
    expect(getSpendingHistory('Food', expenses, [], 31, 2).map((row) => row.spent)).toEqual([33, 44]);
    const history = render(<BudgetHistory categoryName="Food" budgetAmount={1000} expenses={expenses} repayments={[]} billingCycleDay={31} periodsToShow={1} />);
    expect(history.container.querySelector('.budget-history-bar')?.getAttribute('title')).toContain('RM33.00');
    const incomes = [{ id: 'i', userId: 'u', type: 'salary', date: startDate, amount: 100, currency: 'MYR' } as Income];
    expect(calculateIncomeFunding('u', incomes, [budget], { ...DEFAULT_INCOME_LINK, enabled: true }, incomeBudgetRange(31))).toMatchObject({ incomeMinor: 10000, fundingMinor: 8000 });
    const summary = render(<SummaryCardsWidget expenses={expenses} incomes={incomes} repayments={[]} budgets={[budget]} cards={[]} categories={[]} ewallets={[]} banks={[]} billingCycleDay={31} />);
    expect(summary.container.querySelector('.card-value.error-text')).toHaveTextContent('RM44.00');
    expect(summary.container.querySelector('.card-value.success-text')).toHaveTextContent('RM100.00');
  });
});
