import type { CurrencyCode, CurrencyRateSnapshot } from '../types';

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['MYR', 'USD', 'TWD', 'SGD', 'CNY', 'EUR', 'GBP', 'JPY'];
const DEFAULT_CURRENCY: CurrencyCode = 'MYR';

export type MoneySnapshotFields = {
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  exchangeRate: number;
  exchangeRateDate: string;
  exchangeRateFetchedAt: Date;
  exchangeRateProvider: string;
  baseAmount: number;
};

/** Returns null for an explicit unsupported code; missing values remain the legacy MYR default. */
export const parseCurrencyCode = (value?: string | null): CurrencyCode | null => {
  if (value == null || value.trim() === '') return DEFAULT_CURRENCY;
  const normalized = value.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.find((code) => code === normalized) ?? null;
};

export const requireCurrencyCode = (value?: string | null): CurrencyCode => {
  const code = parseCurrencyCode(value);
  if (!code) throw new Error(`Unsupported currency code: ${value}`);
  return code;
};

export const getCurrencyMinorDigits = (currency?: string | null): number =>
  (currency || DEFAULT_CURRENCY).toUpperCase() === 'JPY' ? 0 : 2;

/** Explicit decimal rounding keeps saved values consistent across browsers and locales. */
export const roundMoney = (amount: number, currency?: string | null): number => {
  if (!Number.isFinite(amount)) throw new Error('Money amount must be finite');
  const factor = 10 ** getCurrencyMinorDigits(currency);
  const scaled = amount * factor;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled) + Number.EPSILON);
  return rounded / factor;
};

export const toMinorUnits = (amount: number, currency?: string | null): number => {
  const factor = 10 ** getCurrencyMinorDigits(currency);
  return Math.round(roundMoney(amount, currency) * factor);
};

export const fromMinorUnits = (units: number, currency?: string | null): number => {
  const factor = 10 ** getCurrencyMinorDigits(currency);
  return units / factor;
};

export const formatCurrency = (amount: number, currency?: string | null): string => {
  const code = parseCurrencyCode(currency) || DEFAULT_CURRENCY;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: getCurrencyMinorDigits(code),
    maximumFractionDigits: getCurrencyMinorDigits(code),
  }).format(amount);
};

export const convertWithSnapshot = (amount: number, snapshot: CurrencyRateSnapshot): number => {
  if (!Number.isFinite(amount) || !Number.isFinite(snapshot.rate) || snapshot.rate <= 0) {
    throw new Error('A valid amount and positive exchange rate are required');
  }
  return roundMoney(amount * snapshot.rate, snapshot.toCurrency);
};

export const makeIdentitySnapshot = (currency: CurrencyCode, date: string): CurrencyRateSnapshot => ({
  fromCurrency: currency,
  toCurrency: currency,
  rate: 1,
  rateDate: date,
  provider: 'local',
  fetchedAt: new Date(),
});
