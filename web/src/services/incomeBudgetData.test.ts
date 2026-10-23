import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readIncomeBudgetCycle } from './incomeBudgetData';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import { dataService } from './dataService';
import type { Income } from '../types';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./historyService', () => ({ readHistoryRange: read }));
const range = { startDate: '2026-10-01', endDate: '2026-10-31', today: '2026-10-23' };
describe('income budget full-cycle reads', () => {
  beforeEach(async () => { await offlineQueue.clear(); sessionCache.clearAll(); vi.clearAllMocks(); });
  it('shares matching concurrent reads without replacing the shared collection cache', async () => {
    const cached = [{ id: 'old', userId: 'u', date: '2025-01-01' }];
    sessionCache.set('incomes', 'u', cached);
    const rows = Array.from({ length: 205 }, (_, i) => ({ id: String(i), userId: 'u', date: '2026-10-01' } as Income));
    read.mockResolvedValue(rows);
    const [first, second] = await Promise.all([readIncomeBudgetCycle('u', range), readIncomeBudgetCycle('u', range)]);
    expect(first).toEqual(rows); expect(second).toEqual(rows); expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('incomes', 'u', { startDate: range.startDate, endDate: range.endDate });
    expect(sessionCache.get('incomes', 'u')).toEqual(cached);
  });
  it('rejects a stale result if income changes while reading', async () => {
    let resolve!: (rows: Income[]) => void;
    read.mockImplementation(() => new Promise<Income[]>((done) => { resolve = done; }));
    const request = readIncomeBudgetCycle('u', range);
    await vi.waitFor(() => expect(read).toHaveBeenCalled());
    dataService.markStale('incomes', 'u'); resolve([]);
    await expect(request).rejects.toMatchObject({ code: 'stale-read' });
  });
  it('overlays pending date moves before the funding selector filters its range', async () => {
    sessionCache.set('incomes', 'u', [{ id: 'moved', userId: 'u', date: '2026-09-01', amount: 100, currency: 'MYR', type: 'salary' }]);
    await offlineQueue.enqueue({ type: 'update', entity: 'income', payload: { id: 'moved', userId: 'u', date: '2026-10-05' } });
    read.mockResolvedValue([]);
    expect(await readIncomeBudgetCycle('u', range)).toEqual([expect.objectContaining({ id: 'moved', date: '2026-10-05', amount: 100 })]);
  });
  it('propagates incomplete offline scope instead of inventing zero income', async () => {
    read.mockRejectedValue(Object.assign(new Error('Incomplete'), { code: 'incomplete-cache' }));
    await expect(readIncomeBudgetCycle('u', range)).rejects.toMatchObject({ code: 'incomplete-cache' });
  });
});
