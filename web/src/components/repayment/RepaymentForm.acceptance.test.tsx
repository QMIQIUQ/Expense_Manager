import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../../test/test-utils';
import RepaymentForm from './RepaymentForm';
vi.mock('../../contexts/UserSettingsContext', () => ({ useUserSettings: () => ({ dateFormat: 'YYYY-MM-DD' }) }));

describe('repayment durable acceptance', () => {
  it('retains input and participant while storage has not accepted the write, and blocks a duplicate submit', async () => {
    let complete!: (accepted: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>((resolve) => { complete = resolve; }));
    render(<RepaymentForm expenseId="e" onSubmit={submit} splitParticipants={[{ id: 'p', name: 'Amy', owedMinor: 5000 }]} />);
    fireEvent.change(screen.getByLabelText('Split participant'), { target: { value: 'p' } });
    const amount = screen.getByLabelText(/Repayment amount/i);
    fireEvent.change(amount, { target: { value: '2000' } });
    const button = screen.getByRole('button', { name: 'Save', exact: true });
    fireEvent.click(button); fireEvent.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled(); expect(amount).toHaveValue('20.00');
    expect(submit.mock.calls[0][0]).toMatchObject({ amount: 20, splitParticipantId: 'p', payerName: 'Amy' });
    await act(async () => { complete(false); });
    expect(amount).toHaveValue('20.00');
    expect(screen.getByLabelText('Split participant')).toHaveValue('p');
    fireEvent.click(button);
    await act(async () => { complete(true); });
    await waitFor(() => expect(amount).toHaveValue('0.00'));
  });
});
