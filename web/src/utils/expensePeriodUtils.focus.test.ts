import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { includeFocusedExpense } from './expensePeriodUtils';

const makeExpense = (id: string, userId = 'owner-a'): Expense => ({
  id,
  userId,
  description: id,
  amount: 10,
  currency: 'MYR',
  category: 'Food',
  date: '2026-01-01',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

describe('includeFocusedExpense', () => {
  it('pins an older dashboard target while keeping the current result rows', () => {
    const recent = makeExpense('recent');
    const target = makeExpense('older-target');

    expect(includeFocusedExpense([recent], [target, recent], target.id, 'owner-a')).toEqual([target, recent]);
  });

  it('keeps one owner-scoped row when the target is already present or duplicated', () => {
    const target = makeExpense('target');
    const recent = makeExpense('recent');

    expect(includeFocusedExpense([target, recent, target], [], target.id, 'owner-a')).toEqual([target, recent]);
  });

  it('does not expose another owner row or invent a row when the target is missing', () => {
    const recent = makeExpense('recent');
    const foreignTarget = makeExpense('target', 'owner-b');

    expect(includeFocusedExpense([recent], [foreignTarget], 'target', 'owner-a')).toEqual([recent]);
    expect(includeFocusedExpense([recent], [], 'missing', 'owner-a')).toEqual([recent]);
  });
});
