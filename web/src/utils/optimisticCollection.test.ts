import type { Dispatch, SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineQueue } from './offlineQueue';
import { sessionCache } from './sessionCache';
import { reconcileOptimisticCollection } from './optimisticCollection';

interface Row { id: string; userId: string; amount: number; memo?: string }

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  sessionCache.clearAll();
  await offlineQueue.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('reconcileOptimisticCollection', () => {
  it('restores only failed fields and reapplies other durable updates to state and cache', async () => {
    const acceptedRow: Row = { id: 'income-1', userId: 'owner', amount: 20, memo: 'accepted' };
    sessionCache.set<Row[]>('incomes', 'owner', [{ ...acceptedRow, amount: 30, memo: 'accepted' }]);
    await offlineQueue.enqueue({ type: 'update', entity: 'income', payload: { id: 'income-1', userId: 'owner', amount: 20 } });

    let visible: Row[] = [{ ...acceptedRow, amount: 30, memo: 'accepted' }];
    const setRows: Dispatch<SetStateAction<Row[]>> = (action) => {
      visible = typeof action === 'function' ? action(visible) : action;
    };
    reconcileOptimisticCollection('incomes', 'owner', setRows, {
      type: 'update', id: 'income-1', original: { ...acceptedRow, amount: 10 }, fields: ['amount'],
    });

    expect(visible).toEqual([acceptedRow]);
    expect(sessionCache.get<Row[]>('incomes', 'owner')).toEqual([acceptedRow]);
  });
});
