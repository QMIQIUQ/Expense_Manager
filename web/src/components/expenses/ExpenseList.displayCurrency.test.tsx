import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import type { Category, Expense } from '../../types';
import ExpenseList from './ExpenseList';

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

describe('ExpenseList display currency controls', () => {
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

  it('shows the display currency selector alongside the multi-select toolbar', async () => {
    render(
      <ExpenseList
        expenses={[]}
        categories={[]}
        displayCurrency="MYR"
        onDisplayCurrencyChange={vi.fn()}
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /multi-select/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /currency/i })).toBeInTheDocument();
    });
  });

  it('calls the display currency change handler when a new currency is selected', async () => {
    const onDisplayCurrencyChange = vi.fn();

    render(
      <ExpenseList
        expenses={[]}
        categories={[]}
        displayCurrency="MYR"
        onDisplayCurrencyChange={onDisplayCurrencyChange}
        onDelete={vi.fn()}
        onInlineUpdate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /currency/i }));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: /usd/i }));

    await waitFor(() => {
      expect(onDisplayCurrencyChange).toHaveBeenCalledWith('USD');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
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
      date: '2026-06-24',
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
        onDisplayCurrencyChange={vi.fn()}
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
