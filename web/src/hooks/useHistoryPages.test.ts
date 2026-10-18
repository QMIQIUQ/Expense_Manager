import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistoryPages } from './useHistoryPages';
import { getHistoryPage } from '../services/historyService';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
vi.mock('../services/historyService', () => ({ getHistoryPage: vi.fn() }));
const page = (start: number) => ({ rows: Array.from({ length: 100 }, (_, index) => ({ id: String(start + index), date: '2026-10-18' })), cursor: { id: String(start + 99), date: '2026-10-18' }, hasMore: true });
beforeEach(async () => { vi.clearAllMocks(); await offlineQueue.clear(); });
describe('genuine history cursor retrieval', () => {
  it('opens with one page and retrieves the next page only on demand', async () => {
    vi.mocked(getHistoryPage).mockResolvedValueOnce(page(0)).mockResolvedValueOnce(page(100));
    const loaded = vi.fn();
    const view = renderHook(() => useHistoryPages('expenses', 'user', undefined, [], loaded));
    await waitFor(() => expect(view.result.current.rows).toHaveLength(100));
    expect(getHistoryPage).toHaveBeenCalledTimes(1);
    await act(async () => { await view.result.current.loadMore(); });
    expect(view.result.current.rows).toHaveLength(200);
    expect(getHistoryPage).toHaveBeenLastCalledWith('expenses', 'user', undefined, page(0).cursor);
    expect(loaded).toHaveBeenCalledTimes(2);
  });
  it('ignores a late page from the previous account', async () => {
    let finish!: (value: ReturnType<typeof page>) => void;
    vi.mocked(getHistoryPage).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(page(100));
    const view = renderHook(({ user }) => useHistoryPages('expenses', user, undefined, []), { initialProps: { user: 'first' } });
    view.rerender({ user: 'second' });
    await waitFor(() => expect(view.result.current.rows[0]?.id).toBe('100'));
    await act(async () => { finish(page(0)); });
    expect(view.result.current.rows[0]?.id).toBe('100');
    expect(view.result.current.rows).toHaveLength(100);
  });
  it('restarts cached pagination when a new snapshot replaces its first page', async () => {
    sessionCache.set('expenses', 'user', page(0).rows.map((row) => ({ ...row, userId: 'user' })), { coverage: 'all' });
    const initialVersion = sessionCache.getSnapshot('expenses', 'user')!.version;
    vi.mocked(getHistoryPage).mockResolvedValueOnce({ ...page(0), cached: true, complete: true, cacheVersion: initialVersion });
    const view = renderHook(() => useHistoryPages('expenses', 'user', undefined, []));
    await waitFor(() => expect(view.result.current.rows).toHaveLength(100));
    vi.mocked(getHistoryPage).mockImplementationOnce(async () => ({ ...page(300), cached: true, complete: false, cacheVersion: sessionCache.getSnapshot('expenses', 'user')!.version }));
    await act(async () => { sessionCache.set('expenses', 'user', page(300).rows.map((row) => ({ ...row, userId: 'user' })), { coverage: 'dashboard' }); });
    await waitFor(() => expect(view.result.current.rows[0]?.id).toBe('300'));
    expect(view.result.current.rows).toHaveLength(100);
    expect(view.result.current.incomplete).toBe(true);
    expect(getHistoryPage).toHaveBeenLastCalledWith('expenses', 'user', undefined, undefined);
  });
});
