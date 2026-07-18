import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { Expense } from '../../../types';
import MonthOverMonthWidget from './MonthOverMonthWidget';
import type { WidgetProps } from './types';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../utils/dateUtils', () => ({
  getTodayLocal: () => '2024-07-20',
}));

vi.mock('../../../hooks/useCurrencyConversionMap', () => ({
  useCurrencyConversionMap: (entries: Array<{ key: string; amount: number }>) =>
    Object.fromEntries(entries.map((entry) => [entry.key, entry.amount])),
}));

const commonProps = {
  incomes: [],
  repayments: [],
  budgets: [],
  cards: [],
  categories: [],
  ewallets: [],
  banks: [],
  billingCycleDay: 1,
} satisfies Omit<WidgetProps, 'expenses'>;

const createExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'expense',
  userId: 'user',
  description: 'Test',
  amount: 0,
  currency: 'USD',
  baseCurrency: 'MYR',
  baseAmount: 0,
  category: 'General',
  date: '2024-07-01',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('MonthOverMonthWidget', () => {
  test('uses the selected display currency and shows the previous month transaction count', () => {
    const expenses = [
      createExpense({ id: 'current-food', amount: 100, baseAmount: 450, category: 'Food', date: '2024-07-05' }),
      createExpense({ id: 'current-travel', amount: 20, baseAmount: 90, category: 'Travel', date: '2024-07-10' }),
      createExpense({ id: 'previous', amount: 80, baseAmount: 360, category: 'Food', date: '2024-06-08' }),
    ];

    render(<MonthOverMonthWidget {...commonProps} expenses={expenses} displayCurrency="USD" />);

    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('1 transactions')).toBeInTheDocument();
    expect(screen.getByText('Food: $100.00')).toBeInTheDocument();
  });

  test('opens the current calendar month from the widget', () => {
    const onNavigateToExpenseMonth = vi.fn();
    const expenses = [createExpense({ id: 'current', amount: 10, baseAmount: 45 })];

    render(
      <MonthOverMonthWidget
        {...commonProps}
        expenses={expenses}
        displayCurrency="USD"
        onNavigateToExpenseMonth={onNavigateToExpenseMonth}
      />
    );

    fireEvent.click(screen.getByTitle('thisMonth expenses'));
    expect(onNavigateToExpenseMonth).toHaveBeenCalledWith('2024-07');
  });
});
