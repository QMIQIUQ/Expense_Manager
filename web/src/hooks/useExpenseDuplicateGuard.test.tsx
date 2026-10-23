import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../test/test-utils';
import { useExpenseDuplicateGuard } from './useExpenseDuplicateGuard';
import { reviewExpenseDuplicates } from '../services/expenseDuplicateService';
vi.mock('../services/expenseDuplicateService', () => ({ reviewExpenseDuplicates: vi.fn() }));
const mocked = vi.mocked(reviewExpenseDuplicates);
const submitted = vi.fn();
const input = { date: '2026-10-23', description: 'Lunch', amount: 30 };
const Harness = ({ owner = 'one' }) => {
  const guard = useExpenseDuplicateGuard(owner);
  return <><button onClick={async () => { if (await guard.confirm(input)) submitted(); }}>Submit</button><button onClick={guard.cancel}>Cancel form</button>{guard.dialog}</>;
};
beforeEach(() => { vi.clearAllMocks(); });
describe('duplicate confirmation lifecycle', () => {
  it('requires a deliberate continuation and resolves exactly once', async () => {
    mocked.mockResolvedValue({ candidates: [], complete: false }); render(<Harness />);
    fireEvent.click(screen.getByText('Submit'));
    await screen.findByText('Add anyway'); expect(submitted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Add anyway'));
    await waitFor(() => expect(submitted).toHaveBeenCalledTimes(1));
  });
  it('cancels a pending scope read when the form is closed', async () => {
    let resolve!: (value: { candidates: []; complete: boolean }) => void;
    mocked.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<Harness />); fireEvent.click(screen.getByText('Submit')); fireEvent.click(screen.getByText('Cancel form'));
    await act(async () => resolve({ candidates: [], complete: true }));
    expect(submitted).not.toHaveBeenCalled();
  });
  it('does not submit an old account after switching owners', async () => {
    let resolve!: (value: { candidates: []; complete: boolean }) => void;
    mocked.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const rendered = render(<Harness />); fireEvent.click(screen.getByText('Submit')); rendered.rerender(<Harness owner="two" />);
    await act(async () => resolve({ candidates: [], complete: true })); expect(submitted).not.toHaveBeenCalled();
  });
});
