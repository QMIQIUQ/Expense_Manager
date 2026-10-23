import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { findExpenseDuplicates } from './expenseDuplicateCandidates';
const input = { amount: 120, currency: 'TWD' as const, date: '2026-10-23', description: ' Lunch  Shop ' };
const row = (overrides: Partial<Expense> = {}) => ({ ...input, id: 'one', userId: 'owner', ...overrides } as Expense);
describe('manual expense duplicate hints', () => {
  it('normalizes descriptions but requires the same owner, date and original currency', () => {
    const rows = [row({ description: 'lunch shop' }), row({ userId: 'other' }), row({ date: '2026-10-22' }), row({ currency: 'USD' }), row({ amount: 121 })];
    expect(findExpenseDuplicates('owner', input, rows).map((value) => value.id)).toEqual(['one']);
  });
  it('compares JPY and decimal currencies using the shared minor-unit policy', () => {
    expect(findExpenseDuplicates('owner', { ...input, currency: 'JPY', amount: 100.4 }, [row({ currency: 'JPY', amount: 100 })])).toHaveLength(1);
    expect(findExpenseDuplicates('owner', { ...input, amount: 12.345 }, [row({ amount: 12.35 })])).toHaveLength(1);
  });
});
