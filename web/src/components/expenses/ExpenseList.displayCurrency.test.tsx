import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import type { Category, Expense } from '../../types';
import ExpenseList from './ExpenseList';
import { getTodayLocal } from '../../utils/dateUtils';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' } }),
}));

vi.mock('../../contexts/NotificationContext', () => ({
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
});
