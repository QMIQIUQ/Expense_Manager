import { describe, expect, test } from 'vitest';
import type { Expense } from '../types';
import { DEFAULT_EXPENSE_FILTERS } from '../types/expensePeriod';
import { countInclusiveDays, filterAndSortExpenses, filterExpensesByPeriod } from './expensePeriodUtils';

const makeExpense = (id: string, date: string, overrides: Partial<Expense> = {}): Expense => ({
  id,
  userId: 'user',
  description: id,
  amount: 10,
  category: 'Food',
  date,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('expensePeriodUtils', () => {
  test('treats custom range boundaries as inclusive', () => {
    const expenses = [
      makeExpense('before', '2024-06-30'),
      makeExpense('start', '2024-07-01'),
      makeExpense('end', '2024-07-31'),
      makeExpense('after', '2024-08-01'),
    ];

    expect(filterExpensesByPeriod(expenses, {
      mode: 'range',
      anchorDate: '2024-07-31',
      startDate: '2024-07-01',
      endDate: '2024-07-31',
    }).map((expense) => expense.id)).toEqual(['start', 'end']);
  });

  test('all mode never applies an implicit recent-date limit', () => {
    const expenses = [makeExpense('old', '2020-01-01'), makeExpense('new', '2024-07-01')];
    expect(filterExpensesByPeriod(expenses, { mode: 'all', anchorDate: '2024-07-01' })).toHaveLength(2);
  });

  test('searches notes, category and payment source and applies payment filters', () => {
    const expenses = [
      makeExpense('lunch', '2024-07-01', { notes: 'Client meeting', paymentMethod: 'cash' }),
      makeExpense('train', '2024-07-02', { category: 'Travel', paymentMethod: 'credit_card', cardId: 'card-1' }),
    ];

    const searched = filterAndSortExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, query: 'visa' }, {
      cards: [{ id: 'card-1', userId: 'user', name: 'Visa Gold', createdAt: new Date(), updatedAt: new Date() }],
    });
    expect(searched.map((expense) => expense.id)).toEqual(['train']);

    const cashOnly = filterAndSortExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, paymentMethod: 'cash' });
    expect(cashOnly.map((expense) => expense.id)).toEqual(['lunch']);
  });

  test('sorts by amount and counts leap-day ranges', () => {
    const expenses = [makeExpense('small', '2024-02-28', { amount: 5 }), makeExpense('large', '2024-03-01', { amount: 20 })];
    expect(filterAndSortExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, sort: 'amount-desc' }).map((expense) => expense.id))
      .toEqual(['large', 'small']);
    expect(countInclusiveDays('2024-02-28', '2024-03-01')).toBe(3);
  });
});
