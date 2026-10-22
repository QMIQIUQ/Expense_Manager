import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCompleteExpensePeriod, invalidateExpensePeriodReads } from './expensePeriodReadService';
const fake = vi.hoisted(() => ({ read: vi.fn(), generation: 0, revision: 0, online: true, version: 'v1', validate: vi.fn() }));
vi.mock('./historyService', () => ({ readHistoryRange: fake.read, financialReadGeneration: () => fake.generation, captureCachedHistoryVersion: fake.validate }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: { get isOnline() { return fake.online; } } }));
vi.mock('../utils/offlineQueue', () => ({ offlineQueue: { expenseRevision: () => fake.revision } }));
vi.mock('../utils/sessionCache', () => ({ sessionCache: { getSnapshot: () => ({ version: fake.version }) } }));
beforeEach(() => { fake.generation++; fake.online = true; fake.read.mockReset().mockResolvedValue([]); fake.validate.mockReset(); invalidateExpensePeriodReads('user'); invalidateExpensePeriodReads('other'); });
describe('complete period query sharing and fencing', () => {
  it('bypasses a completed result on explicit refresh and fences a previously running generation', async () => {
    const old = await readCompleteExpensePeriod('user');
    invalidateExpensePeriodReads('user');
    const fresh = await readCompleteExpensePeriod('user');
    expect(fresh.key).not.toBe(old.key); expect(fake.read).toHaveBeenCalledTimes(2);
    invalidateExpensePeriodReads('user');
    let finish!: (rows: unknown[]) => void;
    fake.read.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const running = readCompleteExpensePeriod('user');
    const check = expect(running).rejects.toMatchObject({ code: 'stale-read' });
    invalidateExpensePeriodReads('user'); finish([]); await check;
  });
  it('does not retain a large lifetime result after its simultaneous consumers finish', async () => {
    fake.read.mockResolvedValue(Array.from({ length: 6000 }, (_, id) => ({ id: String(id) })));
    const first = readCompleteExpensePeriod('user'); const second = readCompleteExpensePeriod('user');
    expect(first).toBe(second); expect((await first).rows).toHaveLength(6000); await second;
    await readCompleteExpensePeriod('user'); expect(fake.read).toHaveBeenCalledTimes(2);
  });
  it('enforces a total row budget across periods and an estimated byte budget for large notes', async () => {
    fake.read.mockResolvedValue(Array.from({ length: 2000 }, (_, id) => ({ id: String(id) })));
    const first = { startDate: '2026-01-01', endDate: '2026-01-31' };
    await readCompleteExpensePeriod('user', first);
    await readCompleteExpensePeriod('user', { startDate: '2026-02-01', endDate: '2026-02-28' });
    await readCompleteExpensePeriod('user', { startDate: '2026-03-01', endDate: '2026-03-31' });
    await readCompleteExpensePeriod('user', first); expect(fake.read).toHaveBeenCalledTimes(4);
    invalidateExpensePeriodReads('user');
    fake.read.mockResolvedValue([{ id: 'large-note', notes: 'x'.repeat(3 * 1024 * 1024) }]);
    await readCompleteExpensePeriod('user'); await readCompleteExpensePeriod('user');
    expect(fake.read).toHaveBeenCalledTimes(6);
  });
  it('shares one traversal across compatible consumers and isolates owners and periods', async () => {
    const one = readCompleteExpensePeriod('user'); const two = readCompleteExpensePeriod('user');
    expect(one).toBe(two); await Promise.all([one, two]); expect(fake.read).toHaveBeenCalledOnce();
    await readCompleteExpensePeriod('user'); expect(fake.read).toHaveBeenCalledOnce();
    await readCompleteExpensePeriod('other');
    await readCompleteExpensePeriod('user', { startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(fake.read).toHaveBeenCalledTimes(3);
  });
  it('rejects a traversal invalidated while reading, then allows a new generation', async () => {
    let finish!: (rows: unknown[]) => void;
    fake.read.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const old = readCompleteExpensePeriod('user'); const rejected = expect(old).rejects.toMatchObject({ code: 'stale-read' });
    fake.revision++; finish([]); await rejected;
    await readCompleteExpensePeriod('user'); expect(fake.read).toHaveBeenCalledTimes(2);
  });
  it('never reuses online data for an incomplete offline scope or a replaced snapshot', async () => {
    await readCompleteExpensePeriod('user'); fake.online = false;
    fake.validate.mockImplementationOnce(() => { throw Object.assign(new Error('Incomplete'), { code: 'incomplete-cache' }); });
    await expect(readCompleteExpensePeriod('user')).rejects.toMatchObject({ code: 'incomplete-cache' });
    expect(fake.read).toHaveBeenCalledOnce();
    await readCompleteExpensePeriod('user'); fake.version = 'v2';
    await readCompleteExpensePeriod('user'); expect(fake.read).toHaveBeenCalledTimes(3);
  });
});
