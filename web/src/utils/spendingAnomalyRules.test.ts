import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { anomalyRange, findSpendingAnomalies } from './spendingAnomalyRules';
const row = (date: string, amount: number, extra: Partial<Expense> = {}) => ({ date, amount, currency: 'MYR', category: 'Food', ...extra } as Expense);
const history = ['07', '08', '09'].flatMap((month) => [row(`2026-${month}-02`, 25), row(`2026-${month}-04`, 25)]);
describe('explainable complete-period spending hints', () => {
  it('uses three matched month windows and a median, with an absolute threshold', () => {
    const current = [row('2026-10-02', 50), row('2026-10-03', 50), row('2026-10-04', 50)];
    expect(findSpendingAnomalies([...history, ...current], '2026-10-10')).toMatchObject([{ baselineAmount: 50, currentAmount: 150, sampleCount: 6 }]);
  });
  it('does not misrepresent insufficient samples, scheduled records, or later days', () => {
    const rows = [row('2026-10-02', 200), row('2026-10-03', 200, { scheduledPaymentRecordId: 'scheduled' }), row('2026-10-20', 200)];
    expect(findSpendingAnomalies([...history, ...rows], '2026-10-10')).toEqual([]);
  });
  it('handles year boundaries and booked foreign-currency amounts', () => {
    expect(anomalyRange('2026-01-12')).toEqual({ startDate: '2025-10-01', endDate: '2026-01-12' });
    const current = [1, 2, 3].map((day) => row(`2026-10-0${day}`, 10, { currency: 'USD', baseAmount: 50 }));
    expect(findSpendingAnomalies([...history, ...current], '2026-10-10')[0].currentAmount).toBe(150);
  });
});
