import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionCache } from './sessionCache';
beforeEach(() => { sessionCache.clearAll(); localStorage.clear(); sessionStorage.clear(); });
describe('atomic data and completeness snapshots', () => {
  it('never trusts a detached old completeness marker without its dataset', () => {
    localStorage.setItem('expense-financial-coverage:user:expenses', 'all');
    expect(sessionCache.getSnapshot('expenses', 'user')).toBeNull();
    expect(sessionCache.getCoverage('expenses', 'user')).toBeUndefined();
  });
  it('binds owner, version, row count, timestamp, scope and data in one stored value', () => {
    sessionCache.set('expenses', 'user', [{ id: 'a' }], { coverage: 'all' });
    const snapshot = sessionCache.getSnapshot('expenses', 'user')!;
    const persisted = JSON.parse(localStorage.getItem('expense_snapshot_v2_expenses_user')!);
    expect(persisted).toEqual(snapshot);
    expect(snapshot).toMatchObject({ schemaVersion: 2, entity: 'expenses', userId: 'user', coverage: 'all', rowCount: 1 });
    expect(typeof snapshot.version).toBe('string');
    expect(sessionCache.getSnapshot('expenses', 'other')).toBeNull();
  });
  it('cannot carry full coverage onto a partial server dataset', () => {
    sessionCache.set('expenses', 'user', [{ id: 'old' }], { coverage: 'all' });
    sessionCache.set('expenses', 'user', [{ id: 'recent' }], { coverage: 'dashboard:2026' });
    expect(sessionCache.getCoverage('expenses', 'user')).toBe('dashboard:2026');
    expect(sessionCache.get('expenses', 'user')).toEqual([{ id: 'recent' }]);
  });
  it('preserves coherent data and scope if both storage writes fail, including after reopening', async () => {
    sessionCache.set('expenses', 'user', [{ id: 'partial' }], { coverage: 'dashboard' });
    const saved = localStorage.getItem('expense_snapshot_v2_expenses_user');
    const local = localStorage; const session = sessionStorage;
    vi.stubGlobal('localStorage', { getItem: local.getItem.bind(local), setItem: () => { throw new Error('quota'); } });
    vi.stubGlobal('sessionStorage', { getItem: session.getItem.bind(session), setItem: () => { throw new Error('quota'); } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    sessionCache.set('expenses', 'user', [{ id: 'a' }, { id: 'b' }], { coverage: 'all' });
    expect(sessionCache.getSnapshot('expenses', 'user')).toMatchObject({ coverage: 'all', rowCount: 2 });
    expect(localStorage.getItem('expense_snapshot_v2_expenses_user')).toBe(saved);
    vi.unstubAllGlobals(); warn.mockRestore();
    vi.resetModules();
    const reopened = (await import('./sessionCache')).sessionCache;
    expect(reopened.getSnapshot('expenses', 'user')).toMatchObject({ coverage: 'dashboard', rowCount: 1 });
  });
});
