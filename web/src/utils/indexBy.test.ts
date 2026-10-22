import { describe, expect, it } from 'vitest';
import { indexBy } from './indexBy';
describe('list relationship indexes', () => {
  it('indexes once and preserves duplicate/legacy candidate order for every displayed expense', () => {
    const repayments = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), expenseId: String(index % 100) }));
    let inspected = 0;
    const indexed = indexBy(repayments, (row) => { inspected++; return row.expenseId; });
    for (let index = 0; index < 100; index++) expect(indexed.get(String(index))).toEqual(repayments.filter((row) => row.expenseId === String(index)));
    expect(inspected).toBe(1000);
    expect(indexed.get('missing')).toBeUndefined();
    const candidates = [{ id: 'legacy', date: '2026-10-01' }, { id: 'linked', date: '2026-10-01' }];
    expect(indexBy(candidates, (row) => row.date).get('2026-10-01')).toEqual(candidates);
  });
});
