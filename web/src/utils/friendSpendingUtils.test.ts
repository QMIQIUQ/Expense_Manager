import { describe, expect, it, vi } from 'vitest';
import { getFriendSpendingDateRange, presentFriendSpending } from './friendSpendingUtils';
import type { FriendSpendingSummary } from '../types/friendSpending';

vi.mock('../services/currencyRateService', () => ({
  convertAmountToCurrency: vi.fn(async (amount: number, from: string, to: string) => {
    if (from === to) return amount;
    if (from === 'USD' && to === 'MYR') return amount * 4.5;
    throw new Error('rate unavailable');
  }),
}));

describe('friend spending date ranges', () => {
  it('uses the entire history when the all-time period is selected', () => {
    expect(getFriendSpendingDateRange('all', '2026-10-16', new Date(2026, 9, 16))).toEqual({});
  });

  it('uses the current month through today', () => {
    expect(getFriendSpendingDateRange('current-month', '2026-10-16', new Date(2026, 9, 16))).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-16',
    });
  });

  it('clamps the rolling three-month start to the previous month end', () => {
    expect(getFriendSpendingDateRange('rolling-three-months', '2026-10-31', new Date(2026, 9, 31))).toEqual({
      startDate: '2026-07-31',
      endDate: '2026-10-31',
    });
  });

  it('uses the chosen day as a single-day range', () => {
    expect(getFriendSpendingDateRange('day', '2025-02-03', new Date(2026, 9, 16))).toEqual({
      startDate: '2025-02-03',
      endDate: '2025-02-03',
    });
  });
});

describe('friend spending display currency', () => {
  it('converts available rates and keeps source currency when conversion is unavailable', async () => {
    const summary: FriendSpendingSummary = {
      totalByCurrency: [
        { currency: 'USD', amount: 10 },
        { currency: 'EUR', amount: 20 },
      ],
      categories: [
        { name: 'Food', amounts: [{ currency: 'USD', amount: 10 }] },
        { name: 'Travel', amounts: [{ currency: 'EUR', amount: 20 }] },
      ],
    };

    await expect(presentFriendSpending(summary, 'MYR', '2026-10-16')).resolves.toEqual({
      totals: [
        { currency: 'EUR', amount: 20 },
        { currency: 'MYR', amount: 45 },
      ],
      categories: [
        { name: 'Travel', amount: 20, currency: 'EUR', percentage: 100 },
        { name: 'Food', amount: 45, currency: 'MYR', percentage: 100 },
      ],
    });
  });
});
