import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Expense, Transfer } from '../../types';
import ExpenseList from './ExpenseList';
import { resolveExpenseCurrencyFields } from '../../services/currencyRateService';
import { getTodayLocal } from '../../utils/dateUtils';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'test-user' } }) }));
vi.mock('../../contexts/UserSettingsContext', () => ({ useUserSettings: () => ({ dateFormat: 'YYYY-MM-DD' }) }));
vi.mock('../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNotification: () => ({ showNotification: vi.fn(), updateNotification: vi.fn(), hideNotification: vi.fn() }),
}));
vi.mock('../../services/currencyRateService', () => ({
  resolveExpenseCurrencyFields: vi.fn(async ({ amount, currency, date }: { amount: number; currency: string; date: string }) => ({
    currency, baseCurrency: currency, exchangeRate: 1, exchangeRateDate: date, baseAmount: amount,
  })),
}));

const category: Category = {
  id: 'food', userId: 'test-user', name: 'Food', icon: '🍽️', color: '#ff6b6b', isDefault: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
const expense: Expense = {
  id: 'expense-1', userId: 'test-user', description: 'Lunch', amount: 25, currency: 'MYR',
  category: category.name, date: getTodayLocal(), time: '12:00', paymentMethod: 'cash',
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const reachPaymentTab = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  await screen.findByRole('tablist', { name: /edit expense/i });
  fireEvent.click(screen.getByRole('tab', { name: /payment method/i }));
  await screen.findByRole('heading', { name: /payment method/i });
};

describe('ExpenseList edit save status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses editable tabs and keeps tags beside category and description', async () => {
    render(<ExpenseList expenses={[expense]} categories={[category]} onDelete={vi.fn()} onInlineUpdate={vi.fn().mockResolvedValue('saved')} />);
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByRole('tablist', { name: /edit expense/i });
    expect(document.querySelector('form.expense-edit-workspace')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /date.*amount/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /category.*description/i }));
    expect(await screen.findByRole('group', { name: 'Tags' })).toBeVisible();
    expect(screen.getByLabelText('New tag')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /payment method/i })).not.toBeInTheDocument();
  });

  it('keeps the edit form open when saving fails', async () => {
    vi.mocked(resolveExpenseCurrencyFields).mockResolvedValue({
      currency: 'MYR', baseCurrency: 'MYR', exchangeRate: 1, exchangeRateDate: expense.date, baseAmount: expense.amount,
    });
    const onInlineUpdate = vi.fn().mockResolvedValue('failed');
    render(<ExpenseList expenses={[expense]} categories={[category]} onDelete={vi.fn()} onInlineUpdate={onInlineUpdate} />);
    await reachPaymentTab();
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onInlineUpdate).toHaveBeenCalledWith(expense.id, expect.objectContaining({ description: expense.description, tagIds: [], splitParticipants: [] }), 0));
    expect(await screen.findByText('Failed to save, please try again')).toBeInTheDocument();
    expect(screen.getByText('Edit Expense')).toBeInTheDocument();
  });

  it.each(['saved', 'queued'] as const)('closes the edit form after a durable %s result', async (status) => {
    vi.mocked(resolveExpenseCurrencyFields).mockResolvedValue({
      currency: 'MYR', baseCurrency: 'MYR', exchangeRate: 1, exchangeRateDate: expense.date, baseAmount: expense.amount,
    });
    const onInlineUpdate = vi.fn().mockResolvedValue(status);
    render(<ExpenseList expenses={[expense]} categories={[category]} onDelete={vi.fn()} onInlineUpdate={onInlineUpdate} />);
    await reachPaymentTab();
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onInlineUpdate).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText('Edit Expense')).not.toBeInTheDocument());
  });

  it('preserves an existing transfer while editing and links to transfer history', async () => {
    vi.mocked(resolveExpenseCurrencyFields).mockResolvedValue({
      currency: 'MYR', baseCurrency: 'MYR', exchangeRate: 1, exchangeRateDate: expense.date, baseAmount: expense.amount,
    });
    const transfer: Transfer = {
      id: 'transfer-existing', userId: 'test-user', amount: expense.amount, date: expense.date,
      fromPaymentMethod: 'cash', toPaymentMethod: 'bank', fromPaymentMethodName: '', toPaymentMethodName: '',
      note: 'Existing transfer', createdAt: new Date(), updatedAt: new Date(),
    };
    const onAddTransfer = vi.fn().mockResolvedValue(undefined);
    const onManageTransferHistory = vi.fn();
    const onInlineUpdate = vi.fn().mockResolvedValue('saved');
    render(
      <ExpenseList expenses={[expense]} transfers={[transfer]} categories={[category]} onDelete={vi.fn()}
        onInlineUpdate={onInlineUpdate} onAddTransfer={onAddTransfer} onManageTransferHistory={onManageTransferHistory} />
    );
    await reachPaymentTab();

    expect(screen.getByRole('button', { name: /open transfer history/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onInlineUpdate).toHaveBeenCalledOnce());
    expect(onAddTransfer).not.toHaveBeenCalled();
  });
});
