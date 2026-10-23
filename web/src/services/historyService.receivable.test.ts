import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  online: true,
  rows: [] as Array<Record<string, unknown>>,
  calls: [] as Array<{ owner: string; cursor?: { date: string; id: string }; readTime?: string }>,
  failOnPage: -1,
  readTime: 'snapshot-1',
  deferCallIndex: -1,
  deferPromise: undefined as Promise<void> | undefined,
}));

vi.mock('../config/firebase', () => ({ db: {} }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: { get isOnline() { return state.online; } } }));
vi.mock('./financialSnapshotService', () => ({
  getConsistentHistoryPage: vi.fn(async (
    _name: string,
    owner: string,
    _range?: { startDate: string; endDate: string },
    cursor?: { date: string; id: string },
    readTime?: string,
  ) => {
    const pageIndex = state.calls.length;
    const sourceRows = state.rows;
    const pageReadTime = state.readTime;
    state.calls.push({ owner, cursor, readTime });
    if (pageIndex === state.failOnPage) throw new Error('history page failed');
    if (pageIndex === state.deferCallIndex) await state.deferPromise;
    const start = cursor ? sourceRows.findIndex((row) => row.id === cursor.id) + 1 : 0;
    const rows = sourceRows.slice(start, start + 100);
    const last = rows[rows.length - 1];
    const end = start + rows.length;
    return {
      rows,
      cursor: last ? { date: String(last.date), id: String(last.id) } : undefined,
      hasMore: end < state.rows.length,
      complete: true,
      readTime: readTime ?? pageReadTime,
    };
  }),
}));
vi.mock('firebase/firestore', () => ({}));

import { invalidateFinancialReads, readReceivableExpenses, readScopedExpenses } from './historyService';
import { sessionCache } from '../utils/sessionCache';

const expense = (id: string, userId = 'owner', splitParticipants: unknown[] = [], needsRepaymentTracking = false) => ({
  id, userId, date: '2020-01-02', amount: 120, currency: 'MYR', splitParticipants, needsRepaymentTracking,
});

describe('complete receivable expense history', () => {
  beforeEach(() => {
    state.online = true;
    state.rows = [
      expense('old-split', 'owner', [{ id: 'friend', name: 'Friend', owedMinor: 6000 }]),
      expense('legacy-tracked', 'owner', [], true),
      expense('ordinary-expense'),
      expense('foreign-split', 'another-owner', [{ id: 'friend', name: 'Friend', owedMinor: 1000 }]),
    ];
    state.calls = [];
    state.failOnPage = -1;
    state.readTime = 'snapshot-1';
    state.deferCallIndex = -1;
    state.deferPromise = undefined;
    invalidateFinancialReads('owner');
    sessionCache.remove('receivableExpenses', 'owner');
  });

  it('reads old splits and legacy tracking through one owner-scoped snapshot', async () => {
    const rows = await readReceivableExpenses('owner');
    expect(rows.map((row) => row.id).sort()).toEqual(['legacy-tracked', 'old-split']);
    expect(sessionCache.getCoverage('receivableExpenses', 'owner')).toBe('all');
    expect(state.calls).toEqual([{ owner: 'owner', cursor: undefined, readTime: undefined }]);
  });

  it('pins every page to the same read time and retains ties beyond the first 100 rows', async () => {
    state.rows = Array.from({ length: 205 }, (_, index) => expense(`expense-${String(index).padStart(3, '0')}`, 'owner',
      index === 0 || index === 100 || index === 204 ? [{ id: `p-${index}`, name: 'Friend', owedMinor: 100 }] : []));
    const rows = await readReceivableExpenses('owner');

    expect(rows.map((row) => row.id)).toEqual(['expense-000', 'expense-100', 'expense-204']);
    expect(state.calls).toHaveLength(3);
    expect(state.calls.map((call) => call.readTime)).toEqual([undefined, 'snapshot-1', 'snapshot-1']);
    expect(state.calls.every((call) => call.owner === 'owner')).toBe(true);
    expect(sessionCache.getCoverage('receivableExpenses', 'owner')).toBe('all');
  });

  it('does not replace the previous complete cache when a later page fails', async () => {
    const previous = [expense('previous-snapshot', 'owner', [{ id: 'p', name: 'Friend', owedMinor: 500 }])];
    sessionCache.set('receivableExpenses', 'owner', previous, { coverage: 'all' });
    state.rows = Array.from({ length: 205 }, (_, index) => expense(`expense-${index}`, 'owner', [{ id: `p-${index}`, name: 'Friend', owedMinor: 100 }]));
    state.failOnPage = 1;

    await expect(readReceivableExpenses('owner')).rejects.toThrow('history page failed');
    expect(sessionCache.get('receivableExpenses', 'owner')).toEqual(previous);
    expect(sessionCache.getCoverage('receivableExpenses', 'owner')).toBe('all');
  });

  it('keeps a mixed-time candidate cache incomplete when full revalidation fails', async () => {
    const mixedCandidates = [expense('new-history-plan', 'owner', [{ id: 'friend', name: 'Friend', owedMinor: 500 }])];
    sessionCache.set('receivableExpenses', 'owner', mixedCandidates, { coverage: 'history-page' });
    state.failOnPage = 0;

    await expect(readReceivableExpenses('owner')).rejects.toThrow('history page failed');
    expect(sessionCache.get('receivableExpenses', 'owner')).toEqual(mixedCandidates);
    expect(sessionCache.getCoverage('receivableExpenses', 'owner')).toBe('history-page');
  });

  it('uses only an owner-valid complete cached candidate set offline', async () => {
    state.online = false;
    const rows = [expense('old-split')];
    sessionCache.set('receivableExpenses', 'owner', rows, { coverage: 'all' });
    await expect(readReceivableExpenses('owner')).resolves.toEqual(rows);

    sessionCache.set('receivableExpenses', 'owner', rows, { coverage: 'dashboard' });
    await expect(readReceivableExpenses('owner')).rejects.toMatchObject({ code: 'incomplete-cache' });
  });

  it.each(['receivable read', 'all-scope expense read'] as const)(
    'does not let an older %s overwrite a newer complete candidate cache', async (source) => {
      let releaseOlderRead!: () => void;
      state.rows = [expense('older-candidate', 'owner', [{ id: 'friend', name: 'Friend', owedMinor: 100 }])];
      state.deferCallIndex = state.calls.length;
      state.deferPromise = new Promise<void>((resolve) => { releaseOlderRead = resolve; });
      const olderRead = source === 'receivable read'
        ? readReceivableExpenses('owner')
        : readScopedExpenses('owner', 'all');
      expect(state.calls).toHaveLength(1);

      state.rows = [expense('newer-candidate', 'owner', [{ id: 'friend', name: 'Friend', owedMinor: 200 }])];
      invalidateFinancialReads('owner');
      const newerRead = source === 'receivable read'
        ? await readReceivableExpenses('owner')
        : await readScopedExpenses('owner', 'all');
      expect(newerRead.map((row) => row.id)).toContain('newer-candidate');
      expect(sessionCache.get<ReturnType<typeof expense>[]>('receivableExpenses', 'owner')?.map((row) => row.id))
        .toEqual(['newer-candidate']);

      releaseOlderRead();
      await expect(olderRead).rejects.toMatchObject({ code: 'stale-read' });
      expect(sessionCache.get<ReturnType<typeof expense>[]>('receivableExpenses', 'owner')?.map((row) => row.id))
        .toEqual(['newer-candidate']);
      expect(sessionCache.getCoverage('receivableExpenses', 'owner')).toBe('all');
    },
  );
});
