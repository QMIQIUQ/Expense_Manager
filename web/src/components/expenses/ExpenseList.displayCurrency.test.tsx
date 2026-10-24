import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import type { Category, Expense, Repayment } from '../../types';
import ExpenseList from './ExpenseList';
import { getTodayLocal } from '../../utils/dateUtils';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' } }),
}));

vi.mock('../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNotification: () => ({
      showNotification: vi.fn(),
      updateNotification: vi.fn(),
  }),
}));

vi.mock('../../contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ dateFormat: 'YYYY-MM-DD' }),
}));

describe('ExpenseList display currency', () => {
  const categories: Category[] = [
    {
      id: 'cat-food',
      userId: 'test-user',
      name: 'Food & Dining',
      icon: '🍔',
      color: '#ff6b6b',
      isDefault: true,
      createdAt: new Date('2026-06-24T00:00:00Z'),
    },
  ];

  it('uses the shared header selector instead of rendering a page-level currency control', async () => {
    render(
      <ExpenseList
        expenses={[]}
        categories={[]}
        displayCurrency="MYR"
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /multi-select/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /currency/i })).not.toBeInTheDocument();
  });

  it('keeps the original amount when display currency matches the expense currency', async () => {
    const expense: Expense = {
      id: 'expense-twd-75',
      userId: 'test-user',
      description: 'BOBO TEA',
      amount: 75,
      currency: 'TWD',
      baseAmount: 9.85,
      baseCurrency: 'MYR',
      exchangeRate: 0.131333,
      exchangeRateDate: '2026-06-24',
      exchangeRateFetchedAt: new Date('2026-06-24T00:00:00Z'),
      exchangeRateProvider: 'fawazahmed0/exchange-api',
      category: 'Food & Dining',
      date: getTodayLocal(),
      time: '20:33',
      paymentMethod: 'cash',
      createdAt: new Date('2026-06-24T12:33:00Z'),
      updatedAt: new Date('2026-06-24T12:33:00Z'),
    };

    render(
      <ExpenseList
        expenses={[expense]}
        categories={categories}
        displayCurrency="TWD"
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('NT$75.00').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('NT$74.98')).not.toBeInTheDocument();
  });

  it('caps settled progress and shows actual overpayment after converting to the display currency', async () => {
    const user = userEvent.setup();
    const expense: Expense = {
      id: 'expense-twd-receivable',
      userId: 'test-user',
      description: 'Shared dinner',
      amount: 1000,
      currency: 'TWD',
      baseAmount: 100,
      baseCurrency: 'MYR',
      exchangeRate: 0.1,
      category: 'Food & Dining',
      date: getTodayLocal(),
      paymentMethod: 'cash',
      needsRepaymentTracking: true,
      createdAt: new Date('2026-10-24T00:00:00Z'),
      updatedAt: new Date('2026-10-24T00:00:00Z'),
    };
    const repayments: Repayment[] = [{
      id: 'repayment-twd-overpaid',
      userId: 'test-user',
      expenseId: expense.id!,
      amount: 1500,
      currency: 'TWD',
      baseAmount: 150,
      baseCurrency: 'MYR',
      exchangeRate: 0.1,
      date: getTodayLocal(),
      paymentMethod: 'cash',
      createdAt: new Date('2026-10-24T00:00:00Z'),
      updatedAt: new Date('2026-10-24T00:00:00Z'),
    }];
    render(
      <ExpenseList
        expenses={[expense]}
        repayments={repayments}
        categories={categories}
        displayCurrency="MYR"
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Receipt attachments.*More/i }));

    await waitFor(() => {
      expect(screen.getByText('100% Repaid (RM100.00 / RM100.00)')).toBeInTheDocument();
      expect(screen.getByText('Total Repaid: RM150.00 · Excess: RM50.00')).toBeInTheDocument();
    });
  });

  it('expands a collapsed date group when dashboard focus targets one of its expenses', async () => {
    const focused: Expense = {
      id: 'expense-focus-collapsed',
      userId: 'test-user',
      description: 'Focused shared meal',
      amount: 32,
      currency: 'MYR',
      category: 'Food & Dining',
      date: '2026-10-20',
      paymentMethod: 'cash',
      createdAt: new Date('2026-10-20T12:00:00Z'),
      updatedAt: new Date('2026-10-20T12:00:00Z'),
    };
    const other: Expense = {
      ...focused,
      id: 'expense-other-day',
      description: 'Other day',
      date: '2026-10-19',
    };
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    const onFocusHandled = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const view = render(
      <ExpenseList expenses={[focused, other]} categories={categories} displayCurrency="MYR" onDelete={vi.fn()} onInlineUpdate={vi.fn()} />
    );

    const focusedGroup = screen.getByRole('button', { name: /Collapse 2026-10-20/i });
    fireEvent.click(focusedGroup);
    expect(focusedGroup).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Focused shared meal')).not.toBeInTheDocument();

    view.rerender(
      <ExpenseList expenses={[focused, other]} categories={categories} displayCurrency="MYR" onDelete={vi.fn()} onInlineUpdate={vi.fn()} focusExpenseId={focused.id} onFocusHandled={onFocusHandled} />
    );

    await waitFor(() => {
      expect(screen.getByText('Focused shared meal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Collapse 2026-10-20/i })).toHaveAttribute('aria-expanded', 'true');
      expect(onFocusHandled).toHaveBeenCalledOnce();
    });
    expect(scrollIntoView).toHaveBeenCalledOnce();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('uses dropdown fields for category, currency, and payment method while editing', async () => {
    const user = userEvent.setup();
    const expense: Expense = {
      id: 'expense-edit-controls',
      userId: 'test-user',
      description: 'Market groceries',
      amount: 48,
      currency: 'MYR',
      category: 'Food & Dining',
      date: getTodayLocal(),
      time: '09:30',
      paymentMethod: 'cash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(
      <ExpenseList
        expenses={[expense]}
        categories={categories}
        displayCurrency="MYR"
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn().mockResolvedValue('saved')}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('combobox', { name: /currency/i })).toHaveValue('MYR');

    const categoryTab = screen.getByRole('tab', { name: /category.*description/i });
    await user.click(categoryTab);
    expect(categoryTab).toHaveAttribute('aria-selected', 'true');
    const categorySelect = screen.getByRole('tabpanel').querySelector('select');
    expect(categorySelect).toHaveValue('Food & Dining');
    expect(screen.queryByRole('button', { name: 'Food & Dining' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /payment\s*method/i }));
    expect(screen.getByRole('tabpanel').querySelector('select')).toHaveValue('cash');
  });
});
