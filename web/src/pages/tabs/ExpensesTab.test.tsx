import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { Expense } from '../../types';
import ExpensesTab from './ExpensesTab';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('../../components/expenses/DateNavigator', () => ({
  default: () => <div data-testid="date-navigator" />,
}));

vi.mock('../../components/expenses/ExpensePeriodSummary', () => ({
  default: ({ expenses }: { expenses: Expense[] }) => <div data-testid="summary-count">{expenses.length}</div>,
}));

vi.mock('../../components/expenses/ExpenseList', () => ({
  default: ({ expenses }: { expenses: Expense[] }) => (
    <div data-testid="expense-list">{expenses.map((expense) => expense.description).join(',')}</div>
  ),
}));

const makeExpense = (id: string, date: string, description: string): Expense => ({
  id,
  userId: 'user',
  description,
  amount: 10,
  category: 'Food',
  date,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ExpensesTab shared result model', () => {
  test('feeds the same all-period and searched result set to summary and list', () => {
    render(
      <ExpensesTab
        expenses={[
          makeExpense('old', '2020-01-01', 'Old receipt'),
          makeExpense('new', '2024-07-01', 'New receipt'),
        ]}
        categories={[]}
        cards={[]}
        ewallets={[]}
        banks={[]}
        repayments={[]}
        transfers={[]}
        period={{ mode: 'all', anchorDate: '2024-07-01' }}
        onPeriodChange={vi.fn()}
        displayCurrency="MYR"
        onDisplayCurrencyChange={vi.fn()}
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
        onBulkDelete={vi.fn()}
        onReloadRepayments={vi.fn()}
        onCreateCard={vi.fn()}
        onCreateEWallet={vi.fn()}
        onAddTransfer={vi.fn()}
        quickExpensePresets={[]}
        onQuickExpenseAdd={vi.fn()}
        onQuickExpensePresetsChange={vi.fn()}
        onManageQuickExpenses={vi.fn()}
      />
    );

    expect(screen.getByTestId('summary-count')).toHaveTextContent('2');
    expect(screen.getByTestId('expense-list')).toHaveTextContent('New receipt,Old receipt');

    fireEvent.change(screen.getByPlaceholderText('searchExpenses'), { target: { value: 'old' } });
    expect(screen.getByTestId('summary-count')).toHaveTextContent('1');
    expect(screen.getByTestId('expense-list')).toHaveTextContent('Old receipt');
    expect(screen.getByTestId('expense-list')).not.toHaveTextContent('New receipt');
  });
});
