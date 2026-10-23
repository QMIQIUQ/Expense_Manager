import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../../../test/test-utils';
import SpendingAnomalyWidget from './SpendingAnomalyWidget';
import type { WidgetProps } from './types';
const fake = vi.hoisted(() => ({ owner: 'one', read: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: fake.owner } }) }));
vi.mock('../../../services/spendingInsightService', () => ({ readSpendingInsights: fake.read }));
const props = { expenses: [], incomes: [], repayments: [], budgets: [], cards: [], categories: [], ewallets: [], banks: [], billingCycleDay: 1 } as WidgetProps;
beforeEach(() => { vi.clearAllMocks(); fake.owner = 'one'; });
describe('spending analysis request fencing', () => {
  it('lets a new owner analyze while an old request is pending and drops its late error', async () => {
    let rejectOld!: (reason: Error) => void;
    fake.read.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; })).mockResolvedValueOnce([]);
    const result = render(<SpendingAnomalyWidget {...props} />); fireEvent.click(screen.getByText('Analyze complete period'));
    fake.owner = 'two'; result.rerender(<SpendingAnomalyWidget {...props} />);
    fireEvent.click(screen.getByText('Analyze complete period'));
    await screen.findByText('No significant increase found, or there is not enough comparison data.');
    await act(async () => rejectOld(new Error('old failure')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fake.read.mock.calls.map((call) => call[0])).toEqual(['one', 'two']);
  });
  it('drops invalidated errors, supports retry and shows incomplete-scope failures', async () => {
    let rejectOld!: (reason: Error) => void;
    fake.read.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; })).mockRejectedValueOnce(new Error('incomplete-cache'));
    render(<SpendingAnomalyWidget {...props} />); fireEvent.click(screen.getByText('Analyze complete period'));
    act(() => { window.dispatchEvent(new CustomEvent('offline-queue-changed')); });
    await act(async () => rejectOld(new Error('late failure'))); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Analyze complete period'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('not complete'));
  });
});
