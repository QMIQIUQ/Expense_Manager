import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Expense } from '../../types';
import ExpensesTab from './ExpensesTab';

const fake = vi.hoisted(() => ({ read: vi.fn(), convert: vi.fn(), revision: 0, pending: [] as unknown[], tags: [] }));
vi.mock('../../hooks/useExpenseTags', () => ({ useExpenseTags: () => ({ rows: fake.tags }) }));
vi.mock('../../components/expenses/ExpenseSavedViews', () => ({ ExpenseSavedViews: () => null }));
vi.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../../components/expenses/DateNavigator', () => ({ default: () => <div /> }));
vi.mock('../../components/expenses/ExpensePeriodSummary', () => ({ default: ({ aggregate }: { aggregate?: { total: number; count: number } }) => <p data-testid="total">{aggregate?.count}:{aggregate?.total}</p> }));
vi.mock('../../components/expenses/ExpenseList', () => ({ default: ({ expenses }: { expenses: Expense[] }) => <p data-testid="rows">{expenses.map((row) => `${row.description}(${row.amount})`).join(',')}</p> }));
vi.mock('../../hooks/useHistoryPages', () => ({ useHistoryPages: () => ({ rows: [], hasMore: false, loading: false, incomplete: false }) }));
vi.mock('../../utils/networkStatus', () => ({ networkStatus: { isOnline: true } }));
vi.mock('../../utils/offlineQueue', () => ({ offlineQueue: { expenseRevision: () => fake.revision, getAll: () => fake.pending } }));
vi.mock('../../services/historyService', () => ({ financialReadGeneration: () => 0, readHistoryRange: fake.read, captureCachedHistoryVersion: vi.fn() }));
vi.mock('../../services/financialSnapshotService', () => ({ getConsistentHistoryPage: async () => ({ rows: [], hasMore: false, readTime: 'fixed' }) }));
vi.mock('../../services/currencyRateService', () => ({ convertAmountToCurrency: fake.convert }));
const empty: never[] = [];
const props = { userId: 'search-owner', expenses: empty, categories: empty, cards: empty, ewallets: empty, banks: empty,
  repayments: empty, transfers: empty, period: { mode: 'all' as const, anchorDate: '2026-10-01' }, displayCurrency: 'MYR' as const,
  onPeriodChange: vi.fn(), onDelete: vi.fn(), onInlineUpdate: vi.fn(), onBulkDelete: vi.fn(), onReloadRepayments: vi.fn(),
  onCreateCard: vi.fn(), onCreateEWallet: vi.fn(), onAddTransfer: vi.fn(), quickExpensePresets: empty,
  onQuickExpenseAdd: vi.fn(), onQuickExpensePresetsChange: vi.fn(), onManageQuickExpenses: vi.fn() };
const rows = [
  { id: 'old', userId: props.userId, date: '2020-01-01', description: 'Coffee', amount: 35, category: 'Food' },
  { id: 'new', userId: props.userId, date: '2026-10-01', description: 'Tea', amount: 5, category: 'Food' },
] as Expense[];
beforeEach(() => { vi.useFakeTimers(); fake.revision++; fake.pending = []; fake.read.mockReset().mockResolvedValue(rows); fake.convert.mockReset().mockImplementation(async (amount: number) => amount); });
afterEach(() => vi.useRealTimers());

describe('responsive complete-period search', () => {
  it('preserves the accepted projection while pending writes complete and a replacement period is delayed', async () => {
    render(<ExpensesTab {...props} initialCategory="Food" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('rows')).toHaveTextContent('Coffee(35)');
    fake.read.mockImplementation(() => new Promise(() => undefined));
    fake.pending = [{ id: 'edit', type: 'update', entity: 'expense', payload: { id: 'old', userId: props.userId, amount: 9 }, timestamp: 1 }];
    fake.revision++;
    await act(async () => { window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { entities: ['expense'] } })); await vi.advanceTimersByTimeAsync(75); });
    expect(screen.getByTestId('rows')).toHaveTextContent('Coffee(9)');
    fake.pending = []; fake.revision++;
    await act(async () => { window.dispatchEvent(new CustomEvent('offline-operations-synced', { detail: { userId: props.userId } })); await vi.advanceTimersByTimeAsync(75); });
    expect(screen.getByTestId('rows')).toHaveTextContent('Coffee(9)');
    expect(screen.getByTestId('rows')).toHaveTextContent('Tea(5)');
    expect(screen.queryByTestId('total')).not.toBeInTheDocument();
  });
  it('settles rapid typing once, shares history with totals, and keeps sort-only changes local', async () => {
    render(<ExpensesTab {...props} />);
    const input = screen.getByPlaceholderText('searchExpenses');
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.change(input, { target: { value: 'co' } });
    fireEvent.change(input, { target: { value: 'coffee' } });
    expect(input).toHaveValue('coffee');
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(fake.read).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fake.read).toHaveBeenCalledOnce();
    expect(screen.getByTestId('rows')).toHaveTextContent('Coffee');
    expect(screen.getByTestId('rows')).not.toHaveTextContent('Tea');
    expect(screen.getByTestId('total')).toHaveTextContent('1:35');
    expect(fake.convert).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /filters/ }));
    await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'sortBy' }), { target: { value: 'amount-asc' } }); });
    expect(fake.read).toHaveBeenCalledOnce();
    expect(fake.convert).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: '' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByTestId('total')).toHaveTextContent('2:40');
    expect(fake.read).toHaveBeenCalledOnce();
  });
  it('rejects late results from an old owner and reconciles pending changes in the new complete period', async () => {
    let finish!: (rows: Expense[]) => void;
    fake.read.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = render(<ExpensesTab {...props} initialCategory="Food" />);
    fake.pending = [{ id: 'op', type: 'update', entity: 'expense', payload: { userId: 'other-owner', id: 'other', amount: 9 }, timestamp: 1 }];
    fake.read.mockResolvedValueOnce([{ ...rows[1], id: 'other', userId: 'other-owner', description: 'Other owner' }]);
    await act(async () => { view.rerender(<ExpensesTab {...props} userId="other-owner" initialCategory="Food" />); });
    await act(async () => { finish(rows); });
    expect(screen.getByTestId('rows')).toHaveTextContent('Other owner');
    expect(screen.getByTestId('rows')).not.toHaveTextContent('Coffee');
    expect(screen.getByTestId('total')).toHaveTextContent('1:9');
  });
});
