import { describe, expect, it, vi } from 'vitest';
import { convertAmountShared } from './sharedCurrencyConversion';
const fake = vi.hoisted(() => ({ convert: vi.fn() }));
vi.mock('./currencyRateService', () => ({ convertAmountToCurrency: fake.convert }));
describe('bounded distinct conversion work', () => {
  it('limits simultaneous work for many amounts/dates and still resolves every result', async () => {
    let active = 0; let peak = 0;
    fake.convert.mockImplementation(async (amount: number) => {
      active++; peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      active--; return amount * 2;
    });
    const results = await Promise.all(Array.from({ length: 160 }, (_, index) => convertAmountShared(index, 'USD', 'MYR', `2026-${index}`)));
    expect(results).toEqual(Array.from({ length: 160 }, (_, index) => index * 2));
    expect(peak).toBeLessThanOrEqual(8); expect(fake.convert).toHaveBeenCalledTimes(160);
  });
});
