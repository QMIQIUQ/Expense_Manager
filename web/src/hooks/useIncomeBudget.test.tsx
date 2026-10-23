import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncomeBudget } from './useIncomeBudget';
import { DEFAULT_INCOME_LINK } from '../utils/incomeLinkedBudget';
import { offlineQueue } from '../utils/offlineQueue';
import type { Income } from '../types';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: mocks.auth }));
vi.mock('../contexts/UserSettingsContext', () => ({ useUserSettings: () => ({ settings: { userId: 'u', incomeLinkedBudget: { ...DEFAULT_INCOME_LINK, enabled: true } } }) }));
vi.mock('../services/incomeBudgetData', () => ({ readIncomeBudgetCycle: mocks.read }));
describe('income budget subscription', () => {
  it('bounds repeated stale reads and allows explicit retry afterward', async () => {
    mocks.read.mockRejectedValue(Object.assign(new Error('Always stale'), { code: 'stale-read' }));
    const hook = renderHook(() => useIncomeBudget([], true));
    await waitFor(() => expect(hook.result.current.status).toBe('error'));
    expect(mocks.read).toHaveBeenCalledTimes(4);
    mocks.read.mockResolvedValue([]);
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(mocks.read).toHaveBeenCalledTimes(5);
  });
  beforeEach(async () => { await offlineQueue.clear(); vi.clearAllMocks(); mocks.auth.mockReturnValue({ currentUser: { uid: 'u' } }); });
  it('hides results from the previous account while the next read is pending', async () => {
    mocks.read.mockResolvedValueOnce([{ id: 'a', userId: 'u', amount: 100, type: 'salary', currency: 'MYR', date: new Date().toLocaleDateString('sv') }]);
    const hook = renderHook(() => useIncomeBudget([], true));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    mocks.read.mockImplementation(() => new Promise(() => {}));
    mocks.auth.mockReturnValue({ currentUser: { uid: 'other' } }); hook.rerender();
    expect(hook.result.current.funding).toBeNull(); expect(hook.result.current.incomes).toEqual([]);
  });
  it('ignores a late previous request after an invalidation', async () => {
    const resolvers: Array<(rows: Income[]) => void> = [];
    mocks.read.mockImplementation(() => new Promise<Income[]>((resolve) => resolvers.push(resolve)));
    const hook = renderHook(() => useIncomeBudget([], true));
    await waitFor(() => expect(resolvers).toHaveLength(1));
    act(() => window.dispatchEvent(new CustomEvent('session-cache-updated', { detail: { entity: 'incomes', userId: 'u' } })));
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers[1]([]));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await act(async () => resolvers[0]([{ id: 'old' } as Income]));
    expect(hook.result.current.incomes).toEqual([]);
  });
  it('shows incomplete data and retries on reconnect or explicit retry', async () => {
    mocks.read.mockRejectedValueOnce(Object.assign(new Error('Missing scope'), { code: 'incomplete-cache' })).mockResolvedValue([]);
    const hook = renderHook(() => useIncomeBudget([], true));
    await waitFor(() => expect(hook.result.current.status).toBe('incomplete'));
    expect(hook.result.current.funding).toBeNull();
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.funding).toMatchObject({ status: 'ready', incomeMinor: 0 }));
  });
});
