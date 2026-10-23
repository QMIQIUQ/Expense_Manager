import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import type { QueuedOperation } from './offlineQueue';
import { applyPendingOperations, mergeExpenseRows, mergeReceivableCandidateRows, mergeReceivableCandidatesFromSource } from './pendingOperations';

const row = (id: string, description: string, updatedAt: number, userId = 'owner'): Expense => ({
  id, userId, description, amount: 10, category: 'Food', date: '2026-10-01', currency: 'MYR',
  createdAt: new Date(updatedAt - 100), updatedAt: new Date(updatedAt),
});

describe('owner-scoped expense snapshot merging', () => {
  it('keeps the newest validated row and drops rows from other owners', () => {
    const merged = mergeExpenseRows(
      [row('same', 'newer cached', 200), row('cache-only', 'cached', 100), row('foreign-cache', 'foreign', 300, 'other')],
      [row('same', 'older page', 150), row('fresh', 'fresh page', 250), row('foreign-page', 'foreign', 400, 'other')],
      'owner',
      [],
    );

    expect(merged.map(({ id }) => id).sort()).toEqual(['cache-only', 'fresh', 'same']);
    expect(merged.find((expense) => expense.id === 'same')?.description).toBe('newer cached');
  });

  it('projects queued changes only onto cache-only records', () => {
    const operations = [
      { id: 'update', entity: 'expense', type: 'update', timestamp: 300, retryCount: 0,
        payload: { id: 'cache-only', userId: 'owner', description: 'pending edit' } },
      { id: 'delete', entity: 'expense', type: 'delete', timestamp: 301, retryCount: 0,
        payload: { id: 'deleted', userId: 'owner' } },
    ] as QueuedOperation[];
    const merged = mergeExpenseRows([row('cache-only', 'old cache', 100), row('deleted', 'deleted cache', 100)],
      [row('server', 'server row', 200)], 'owner', operations);

    expect(merged.map(({ id }) => id).sort()).toEqual(['cache-only', 'server']);
    expect(merged.find((expense) => expense.id === 'cache-only')?.description).toBe('pending edit');
  });

  it('projects current outbox updates onto raw history rows before publishing them', () => {
    const operation = { id: 'update', entity: 'expense', type: 'update', timestamp: 300, retryCount: 0,
      payload: { id: 'history-row', userId: 'owner', description: 'pending edit' } } as QueuedOperation;
    const merged = mergeExpenseRows([], [row('history-row', 'server value', 200)], 'owner', [operation]);

    expect(merged[0].description).toBe('pending edit');
  });

  it('treats a complete server snapshot as authoritative while preserving valid queued creates', () => {
    const create = { ...row('pending-create', 'queued expense', 300), needsRepaymentTracking: true };
    const operation = { id: 'create', entity: 'expense', type: 'create', timestamp: 300, retryCount: 0,
      payload: create } as QueuedOperation;
    const merged = mergeExpenseRows(
      [row('deleted-on-server', 'stale cache', 100), row('outside-page', 'stale cache', 100)],
      [row('server-current', 'authoritative', 200)],
      'owner',
      [operation],
      { mode: 'complete' },
    );

    expect(merged.map(({ id }) => id).sort()).toEqual(['pending-create', 'server-current']);
  });

  it('keeps a complete snapshot authoritative when a later partial page is merged', () => {
    const complete = mergeExpenseRows(
      [row('deleted-on-server', 'stale cache', 100), row('outside-page', 'cached', 100)],
      [row('server-current', 'authoritative', 200), row('page-row', 'authoritative page row', 200)],
      'owner', [], { mode: 'complete' },
    );
    const partial = mergeExpenseRows(
      complete,
      [row('page-row', 'new page value', 300)],
      'owner', [], { mode: 'partial' },
    );

    expect(partial.map(({ id }) => id).sort()).toEqual(['page-row', 'server-current']);
    expect(partial.find(({ id }) => id === 'page-row')?.description).toBe('new page value');
  });

  it('projects queued offline create, update and delete operations in order after selecting server rows', () => {
    const operations = [
      { id: 'create', entity: 'expense', type: 'create', timestamp: 300, retryCount: 0,
        payload: row('offline-create', 'queued create', 300) },
      { id: 'update', entity: 'expense', type: 'update', timestamp: 301, retryCount: 0,
        payload: { id: 'server-row', userId: 'owner', description: 'queued update' } },
      { id: 'delete', entity: 'expense', type: 'delete', timestamp: 302, retryCount: 0,
        payload: { id: 'server-delete', userId: 'owner' } },
      { id: 'foreign', entity: 'expense', type: 'create', timestamp: 303, retryCount: 0,
        payload: row('foreign-create', 'other owner', 303, 'other') },
    ] as QueuedOperation[];
    const merged = mergeExpenseRows(
      [row('stale-cache-only', 'stale', 100)],
      [row('server-row', 'server', 200), row('server-delete', 'pending delete', 200)],
      'owner', operations, { mode: 'complete' },
    );

    expect(merged.map(({ id }) => id).sort()).toEqual(['offline-create', 'server-row']);
    expect(merged.find(({ id }) => id === 'server-row')?.description).toBe('queued update');
  });

  it('keeps the expected version out of the visible expense row', () => {
    const merged = applyPendingOperations('expenses', 'owner', [row('expense', 'saved', 100)], [{
      id: 'versioned-update', entity: 'expense', type: 'update', timestamp: 200, retryCount: 0,
      payload: { id: 'expense', userId: 'owner', description: 'pending edit', expectedRevision: 4, revision: 5 },
    } as QueuedOperation]);

    expect(merged[0]).toMatchObject({ id: 'expense', description: 'pending edit', revision: 5 });
    expect(merged[0]).not.toHaveProperty('expectedRevision');
  });

  it('preserves page-external cached rows but prunes receivables missing from the complete candidate set', () => {
    const staleReceivable = { ...row('no-longer-receivable', 'old split', 100), needsRepaymentTracking: true };
    const localReceivable = { ...row('local-receivable', 'pending split', 200), needsRepaymentTracking: true };
    const operation = { id: 'create', entity: 'expense', type: 'create', timestamp: 200, retryCount: 0,
      payload: localReceivable } as QueuedOperation;
    const merged = mergeExpenseRows(
      [staleReceivable, row('history-outside-page', 'ordinary history', 100)],
      [row('current-page', 'current page', 300)],
      'owner',
      [operation],
      { authoritativeReceivableIds: new Set() },
    );

    expect(merged.map(({ id }) => id).sort()).toEqual(['current-page', 'history-outside-page', 'local-receivable']);
  });

  it('adds a newly tracked history row to the complete candidate set before pruning cached receivables', () => {
    const existingCandidate = { ...row('existing-candidate', 'newer candidate', 300), needsRepaymentTracking: true };
    const newlyTrackedHistoryRow = { ...row('new-candidate', 'newly tracked in history', 400), needsRepaymentTracking: true };
    const olderUntrackedHistoryRow = { ...row('existing-candidate', 'stale untracked history value', 200), needsRepaymentTracking: false };
    const foreignCandidate = { ...row('foreign-candidate', 'foreign', 300, 'other'), needsRepaymentTracking: true };
    const candidates = mergeReceivableCandidateRows(
      [existingCandidate, foreignCandidate],
      [newlyTrackedHistoryRow, olderUntrackedHistoryRow],
      'owner',
      [],
    );
    const merged = mergeExpenseRows(
      [existingCandidate, { ...row('stale-candidate', 'stale cache', 100), needsRepaymentTracking: true }],
      [newlyTrackedHistoryRow],
      'owner',
      [],
      { authoritativeReceivableIds: new Set(candidates.map(({ id }) => id!)), incomingSource: 'verified-partial' },
    );

    expect(candidates.map(({ id }) => id).sort()).toEqual(['existing-candidate', 'new-candidate']);
    expect(merged.map(({ id }) => id).sort()).toEqual(['existing-candidate', 'new-candidate']);
    expect(merged.find(({ id }) => id === 'existing-candidate')?.description).toBe('newer candidate');
  });

  it('keeps a new tracked history row even when an older complete candidate set does not include it', () => {
    const newlyTrackedHistoryRow = { ...row('new-candidate', 'newly tracked in history', 400), needsRepaymentTracking: true };
    const merged = mergeExpenseRows(
      [],
      [newlyTrackedHistoryRow],
      'owner',
      [],
      { authoritativeReceivableIds: new Set(), incomingSource: 'verified-partial' },
    );

    expect(merged.map(({ id }) => id)).toEqual(['new-candidate']);
  });

  it('does not reintroduce an old cached receivable that the candidate snapshot excludes', () => {
    const staleExpenseCacheRow = { ...row('settled', 'old cached split', 100), needsRepaymentTracking: true };
    const candidates = new Set<string>();
    const merged = mergeExpenseRows(
      [],
      [staleExpenseCacheRow],
      'owner',
      [],
      { authoritativeReceivableIds: candidates, incomingSource: 'cached' },
    );

    expect(merged).toEqual([]);
  });

  it('preserves cached receivables absent from a partial candidate snapshot', () => {
    const cachedReceivableOutsidePage = { ...row('older-receivable', 'valid offline receivable', 100), needsRepaymentTracking: true };
    const knownHistoryPageReceivable = { ...row('history-page-receivable', 'partial candidate', 200), needsRepaymentTracking: true };
    const merged = mergeExpenseRows(
      [cachedReceivableOutsidePage],
      [cachedReceivableOutsidePage, knownHistoryPageReceivable],
      'owner',
      [],
      { incomingSource: 'cached' },
    );

    expect(merged.map(({ id }) => id).sort()).toEqual(['history-page-receivable', 'older-receivable']);
  });

  it('lets a newer verified history row remove an old cached receivable without a complete candidate set', () => {
    const cachedTracked = { ...row('settled', 'old cached split', 300), needsRepaymentTracking: true };
    const verifiedUntracked = { ...row('settled', 'split removed on server', 400), needsRepaymentTracking: false };
    const merged = mergeExpenseRows([cachedTracked], [verifiedUntracked], 'owner', [], { incomingSource: 'verified-partial' });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'settled', description: 'split removed on server', needsRepaymentTracking: false });
  });

  it('does not let a cached history page restore tracking after a verified page removed it', () => {
    const tracked = { ...row('settled', 'tracked', 300), needsRepaymentTracking: true };
    const verifiedUntracked = { ...row('settled', 'settled on server', 400), needsRepaymentTracking: false };
    const cachedStaleTracked = { ...row('settled', 'old cached split', 200), needsRepaymentTracking: true };
    const afterVerifiedPage = mergeReceivableCandidatesFromSource([tracked], [verifiedUntracked], 'owner', 'verified-partial', []);
    const afterCachedPage = mergeReceivableCandidatesFromSource(afterVerifiedPage, [cachedStaleTracked], 'owner', 'cached', []);

    expect(afterVerifiedPage).toEqual([]);
    expect(afterCachedPage).toEqual([]);
  });

  it('does not let a legacy row without updatedAt replace a verified newer row', () => {
    const verified = { ...row('same', 'verified', 500), needsRepaymentTracking: true };
    const legacyUntracked = { ...row('same', 'legacy page value', 600), updatedAt: undefined, needsRepaymentTracking: false } as Expense;
    const merged = mergeExpenseRows([verified], [legacyUntracked], 'owner');
    const candidates = mergeReceivableCandidateRows([verified], [legacyUntracked], 'owner', []);

    expect(merged.find(({ id }) => id === 'same')?.description).toBe('verified');
    expect(candidates.map(({ id }) => id)).toEqual(['same']);
  });
});
