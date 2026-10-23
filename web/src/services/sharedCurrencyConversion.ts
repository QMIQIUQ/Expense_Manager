import { convertAmountToCurrency } from './currencyRateService';

// Only deterministic derived amounts live here; no owner data or persistent financial datasets.
const values = new Map<string, number>();
const pending = new Map<string, Promise<number>>();
let active = 0;
const waiting: (() => void)[] = [];
const withSlot = async (run: () => Promise<number>): Promise<number> => {
  if (active < 8) active++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  try { return await run(); }
  finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
};
const keyFor = (amount: number, from: string | undefined, to: string, date: string) => JSON.stringify([amount, from, to, date]);
export const peekConvertedAmount = (amount: number, from: string | undefined, to: string, date: string): number | undefined =>
  values.get(keyFor(amount, from, to, date));

export const convertAmountShared = (amount: number, from: string | undefined, to: string, date: string): Promise<number> => {
  const key = keyFor(amount, from, to, date);
  const cached = values.get(key);
  if (cached !== undefined) return Promise.resolve(cached);
  const running = pending.get(key);
  if (running) return running;
  const request = withSlot(() => convertAmountToCurrency(amount, from, to, date)).then((value) => {
    values.set(key, value);
    while (values.size > 2048) values.delete(values.keys().next().value!);
    return value;
  }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
};
