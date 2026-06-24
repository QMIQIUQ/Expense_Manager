import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
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
});
