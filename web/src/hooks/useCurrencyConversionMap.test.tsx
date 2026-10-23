import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrencyConversionMapState } from './useCurrencyConversionMap';
const fake = vi.hoisted(() => ({ convert: vi.fn(), date: 0 }));
vi.mock('../services/currencyRateService', () => ({ convertAmountToCurrency: fake.convert }));
beforeEach(() => { fake.convert.mockReset(); fake.date++; });
const entries = (amount = 2) => [{ key: 'row', amount, sourceCurrency: 'USD', date: '2026-10-' + String(fake.date).padStart(2, '0') }];
describe('shared conversion work', () => {
  it('shares one conversion between widgets, and never reuses it for a changed amount', async () => {
    let finish!: (value: number) => void;
    fake.convert.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue(12);
    const first = renderHook(({ rows }) => useCurrencyConversionMapState(rows, 'MYR'), { initialProps: { rows: entries() } });
    const second = renderHook(() => useCurrencyConversionMapState(entries(), 'MYR'));
    await waitFor(() => expect(fake.convert).toHaveBeenCalledTimes(1));
    await act(async () => { finish(8); });
    await waitFor(() => expect(first.result.current.amountsByKey.row).toBe(8));
    expect(second.result.current.amountsByKey.row).toBe(8);
    first.rerender({ rows: entries(3) });
    expect(first.result.current.amountsByKey.row).not.toBe(8);
    await waitFor(() => expect(first.result.current.amountsByKey.row).toBe(12));
    expect(fake.convert).toHaveBeenCalledTimes(2);
  });
  it('keeps same-currency minor-unit rounding synchronous without asynchronous renders', async () => {
    let renders = 0;
    const rows = [{ key: 'yen', amount: 10.6, sourceCurrency: 'JPY', date: '2026-10-01' },
      { key: 'refund', amount: -2.6, sourceCurrency: 'JPY', date: '2026-10-01' },
      { key: 'zero', amount: 0, sourceCurrency: 'JPY', date: '2026-10-01' }];
    const hook = renderHook(() => { renders++; return useCurrencyConversionMapState(rows, 'JPY'); });
    expect(hook.result.current).toMatchObject({ amountsByKey: { yen: 11, refund: -3, zero: 0 }, isLoading: false });
    await act(async () => { await Promise.resolve(); });
    expect(renders).toBe(1); expect(fake.convert).not.toHaveBeenCalled();
  });
  it('does not publish an old conversion after currency changes', async () => {
    let finish!: (value: number) => void;
    fake.convert.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(200);
    const rows = entries();
    const hook = renderHook(({ target }) => useCurrencyConversionMapState(rows, target), { initialProps: { target: 'MYR' } });
    await waitFor(() => expect(fake.convert).toHaveBeenCalledTimes(1));
    hook.rerender({ target: 'JPY' });
    await waitFor(() => expect(hook.result.current.amountsByKey.row).toBe(200));
    await act(async () => { finish(8); });
    expect(hook.result.current.amountsByKey.row).toBe(200);
  });
  it('keeps a failed conversion visibly failed and allows a later retry', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.convert.mockRejectedValueOnce(new Error('Provider unavailable')).mockResolvedValueOnce(9);
    const hook = renderHook(() => useCurrencyConversionMapState(entries(), 'MYR'));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(hook.result.current.amountsByKey.row).toBeUndefined();
    expect(hook.result.current.failedKeys).toEqual(['row']);
    hook.unmount();
    const retry = renderHook(() => useCurrencyConversionMapState(entries(), 'MYR'));
    await waitFor(() => expect(retry.result.current.amountsByKey.row).toBe(9));
    error.mockRestore();
  });
});
