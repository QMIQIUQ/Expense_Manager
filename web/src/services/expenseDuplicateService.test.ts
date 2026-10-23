import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ read: vi.fn(), apply: vi.fn() }));
vi.mock('./expensePeriodReadService', () => ({ readCompleteExpensePeriod: fake.read }));
vi.mock('../utils/pendingOperations', () => ({ applyPendingOperations: fake.apply }));
import { reviewExpenseDuplicates } from './expenseDuplicateService';
const input = { date: '2026-10-23', amount: 30, description: 'Lunch', currency: 'MYR' as const };
const expense = { ...input, id: 'queued', userId: 'owner' };
beforeEach(() => { vi.resetAllMocks(); });
describe('complete-scoped duplicate review', () => {
  it('reads the full single day and includes durable queued changes', async () => {
    fake.read.mockResolvedValue({ rows: [] }); fake.apply.mockReturnValue([expense]);
    expect(await reviewExpenseDuplicates('owner', input)).toMatchObject({ complete: true, candidates: [expense] });
    expect(fake.read).toHaveBeenCalledWith('owner', { startDate: input.date, endDate: input.date });
  });
  it('labels an incomplete offline scope without discarding queued candidates', async () => {
    fake.read.mockRejectedValue(new Error('incomplete-cache')); fake.apply.mockReturnValue([expense]);
    expect(await reviewExpenseDuplicates('owner', input)).toEqual({ complete: false, candidates: [expense] });
  });
});
