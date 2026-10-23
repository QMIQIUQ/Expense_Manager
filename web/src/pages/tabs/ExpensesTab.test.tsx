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

vi.mock('../../components/expenses/ExpenseSavedViews', () => ({ ExpenseSavedViews: () => null }));
vi.mock('../../components/categories/ExpenseTagManager', () => ({ ExpenseTagManager: () => null }));

vi.mock('../../components/expenses/ExpensePeriodSummary', () => ({
  default: ({ expenses }: { expenses: Expense[] }) => <div data-testid="summary-count">{expenses.length}</div>,
}));

vi.mock('../../components/expenses/ExpenseList', () => ({
  default: ({ expenses, focusExpenseId }: { expenses: Expense[]; focusExpenseId?: string }) => (
    <div data-testid="expense-list" data-focus-id={focusExpenseId}>{expenses.map((expense) => expense.description).join(',')}</div>
  ),
}));

vi.mock('../../hooks/useHistoryPages', () => ({
  useHistoryPages: () => ({ rows: [], hasMore: false, loading: false, incomplete: false, error: undefined, retry: vi.fn(), loadMore: vi.fn() }),
}));
vi.mock('../../hooks/useExpenseTags', () => ({ useExpenseTags: () => ({ rows: [] }) }));
vi.mock('../../services/expenseAggregateService', () => ({
  readExpenseAggregate: vi.fn(async () => ({ count: 0, total: 0, byCategory: [] })),
  summarizeCompleteExpensePeriod: vi.fn(),
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

  test('applies a dashboard category with its selected date range', () => {
    render(
      <ExpensesTab
        expenses={[
          makeExpense('food-in-cycle', '2024-07-15', 'Food in cycle'),
          { ...makeExpense('travel-in-cycle', '2024-07-16', 'Travel in cycle'), category: 'Travel' },
          makeExpense('food-outside-cycle', '2024-08-15', 'Food outside cycle'),
        ]}
        categories={[]}
        cards={[]}
        ewallets={[]}
        banks={[]}
        repayments={[]}
        transfers={[]}
        period={{ mode: 'range', anchorDate: '2024-08-14', startDate: '2024-07-15', endDate: '2024-08-14' }}
        onPeriodChange={vi.fn()}
        initialCategory="Food"
        displayCurrency="MYR"
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

    expect(screen.getByTestId('summary-count')).toHaveTextContent('1');
    expect(screen.getByTestId('expense-list')).toHaveTextContent('Food in cycle');
    expect(screen.getByText('Food ×')).toBeInTheDocument();
  });

  test('keeps a dashboard-focused expense visible outside the current period and filters', () => {
    const focused = makeExpense('dashboard-focus', '2026-10-20', 'Dashboard reminder expense');
    render(
      <ExpensesTab
        userId="user"
        expenses={[focused]}
        categories={[]}
        cards={[]}
        ewallets={[]}
        banks={[]}
        repayments={[]}
        transfers={[]}
        period={{ mode: 'range', anchorDate: '2024-08-14', startDate: '2024-07-15', endDate: '2024-08-14' }}
        onPeriodChange={vi.fn()}
        initialCategory="Travel"
        displayCurrency="MYR"
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
        onBulkDelete={vi.fn()}
        onReloadRepayments={vi.fn()}
        onCreateCard={vi.fn()}
        onCreateEWallet={vi.fn()}
        onCreateBank={vi.fn()}
        onAddTransfer={vi.fn()}
        focusExpenseId={focused.id}
        onClearFocusExpense={vi.fn()}
        quickExpensePresets={[]}
        onQuickExpenseAdd={vi.fn()}
        onQuickExpensePresetsChange={vi.fn()}
        onManageQuickExpenses={vi.fn()}
      />
    );

    expect(screen.getByTestId('expense-list')).toHaveTextContent('Dashboard reminder expense');
    expect(screen.getByTestId('expense-list')).toHaveAttribute('data-focus-id', focused.id);
    expect(screen.getByText('dashboardExpenseFocusNotice')).toBeInTheDocument();
  });
});
