import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../../test/test-utils';
import AccountReconciliationManager from './AccountReconciliationManager';
import type { Bank } from '../../types';
const fake = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'owner' } }) }));
vi.mock('../../services/accountReconciliationService', () => ({
  reconciliationId: vi.fn(async () => 'r'), loadReconciliation: vi.fn(async () => undefined),
  readReconciliationReport: fake.report, loadReconciliationMarks: vi.fn(async () => []), saveReconciliation: vi.fn(),
}));
describe('reconciliation request fencing', () => {
  it('keeps a replacement request busy when an invalidated earlier read finishes', async () => {
    let first!: (value: object) => void; let second!: (value: object) => void;
    fake.report.mockImplementationOnce(() => new Promise((resolve) => { first = resolve; })).mockImplementationOnce(() => new Promise((resolve) => { second = resolve; }));
    const bank = { id: 'b', userId: 'owner', name: 'Bank', currency: 'MYR' } as Bank;
    render(<AccountReconciliationManager banks={[bank]} cards={[]} ewallets={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load complete statement period' }));
    await waitFor(() => expect(fake.report).toHaveBeenCalledTimes(1));
    act(() => { window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { entities: ['expense'] } })); });
    fireEvent.click(screen.getByRole('button', { name: 'Load complete statement period' }));
    await waitFor(() => expect(fake.report).toHaveBeenCalledTimes(2));
    const report = { movements: [], sourceFingerprint: 'a'.repeat(64), readTime: '2026-10-23T00:00:00Z' };
    await act(async () => { first(report); });
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    await act(async () => { second(report); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load complete statement period' })).toBeEnabled());
  });
});
