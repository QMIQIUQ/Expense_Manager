import type { CurrencyCode, CurrencyRateSnapshot, Expense } from '../types';
import {
  DEFAULT_BASE_CURRENCY,
  buildExpenseCurrencyFields,
  normalizeCurrencyCode,
} from '../utils/currencyUtils';

const PROVIDER_NAME = 'fawazahmed0/exchange-api';
const PRIMARY_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api';
const FALLBACK_BASE_URL = 'https://currency-api.pages.dev';
const CACHE_PREFIX = 'expense_manager_currency_rate_';

type SerializedCurrencyRateSnapshot = Omit<CurrencyRateSnapshot, 'fetchedAt'> & {
  fetchedAt: string;
};

const memoryCache = new Map<string, CurrencyRateSnapshot>();

const getCacheKey = (fromCurrency: CurrencyCode, toCurrency: CurrencyCode, rateDate: string): string => {
  return `${CACHE_PREFIX}${rateDate}:${fromCurrency}:${toCurrency}`;
};

const serializeSnapshot = (snapshot: CurrencyRateSnapshot): SerializedCurrencyRateSnapshot => ({
  ...snapshot,
  fetchedAt: snapshot.fetchedAt.toISOString(),
});

const deserializeSnapshot = (snapshot: SerializedCurrencyRateSnapshot): CurrencyRateSnapshot => ({
  ...snapshot,
  fetchedAt: new Date(snapshot.fetchedAt),
});

const readFromLocalStorage = (key: string): CurrencyRateSnapshot | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedCurrencyRateSnapshot;
    if (!parsed?.fromCurrency || !parsed?.toCurrency || !parsed?.rateDate || !parsed?.provider || !parsed?.fetchedAt) {
      return null;
    }
    return deserializeSnapshot(parsed);
  } catch {
    return null;
  }
};

const writeToLocalStorage = (key: string, snapshot: CurrencyRateSnapshot): void => {
  try {
    localStorage.setItem(key, JSON.stringify(serializeSnapshot(snapshot)));
  } catch {
    // Ignore quota and availability errors.
  }
};

const getCachedSnapshot = (key: string): CurrencyRateSnapshot | null => {
  const memoryHit = memoryCache.get(key);
  if (memoryHit) return memoryHit;

  const localHit = readFromLocalStorage(key);
  if (localHit) {
    memoryCache.set(key, localHit);
    return localHit;
  }

  return null;
};

const setCachedSnapshot = (key: string, snapshot: CurrencyRateSnapshot): void => {
  memoryCache.set(key, snapshot);
  writeToLocalStorage(key, snapshot);
};

const parseRateResponse = (
  payload: Record<string, unknown>,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  requestedDate: string,
  provider: string
): CurrencyRateSnapshot => {
  const fromKey = fromCurrency.toLowerCase();
  const toKey = toCurrency.toLowerCase();
  const fromRates = payload[fromKey] as Record<string, unknown> | undefined;
  const rawRate = fromRates?.[toKey];
  const rate = typeof rawRate === 'number' ? rawRate : Number(rawRate);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Rate not available for ${fromCurrency} -> ${toCurrency}`);
  }

  return {
    fromCurrency,
    toCurrency,
    rate,
    rateDate: typeof payload.date === 'string' ? payload.date : requestedDate,
    provider,
    fetchedAt: new Date(),
  };
};

const fetchFromSource = async (
  baseUrl: string,
  dateToken: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<CurrencyRateSnapshot | null> => {
  const url = baseUrl.includes('jsdelivr')
    ? `${baseUrl}@${dateToken}/v1/currencies/${fromCurrency.toLowerCase()}.min.json`
    : `${dateToken}.${baseUrl.replace(/^https?:\/\//, '')}/v1/currencies/${fromCurrency.toLowerCase()}.min.json`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;

  const payload = (await response.json()) as Record<string, unknown>;
  return parseRateResponse(payload, fromCurrency, toCurrency, dateToken, `${PROVIDER_NAME}:${baseUrl.includes('jsdelivr') ? 'jsdelivr' : 'pages'}`);
};

const fetchHistoricalRate = async (
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  requestedDate: string
): Promise<CurrencyRateSnapshot> => {
  const dateTokens = [requestedDate];
  if (requestedDate !== 'latest') {
    dateTokens.push('latest');
  }

  const sourceUrls = [PRIMARY_BASE_URL, FALLBACK_BASE_URL];

  for (const dateToken of dateTokens) {
    for (const baseUrl of sourceUrls) {
      try {
        const snapshot = await fetchFromSource(baseUrl, dateToken, fromCurrency, toCurrency);
        if (snapshot) {
          return snapshot;
        }
      } catch (error) {
        if (baseUrl === sourceUrls[sourceUrls.length - 1] && dateToken === dateTokens[dateTokens.length - 1]) {
          throw error;
        }
      }
    }
  }

  throw new Error(`Unable to fetch exchange rate for ${fromCurrency} -> ${toCurrency} on ${requestedDate}`);
};

export const getHistoricalRate = async (
  fromCurrencyInput: string | undefined,
  toCurrencyInput: string | undefined,
  date: string
): Promise<CurrencyRateSnapshot> => {
  const fromCurrency = normalizeCurrencyCode(fromCurrencyInput);
  const toCurrency = normalizeCurrencyCode(toCurrencyInput || DEFAULT_BASE_CURRENCY);
  const rateDate = date || new Date().toISOString().split('T')[0];
  const cacheKey = getCacheKey(fromCurrency, toCurrency, rateDate);

  const cached = getCachedSnapshot(cacheKey);
  if (cached) {
    return cached;
  }

  if (fromCurrency === toCurrency) {
    const snapshot: CurrencyRateSnapshot = {
      fromCurrency,
      toCurrency,
      rate: 1,
      rateDate,
      provider: 'local',
      fetchedAt: new Date(),
    };
    setCachedSnapshot(cacheKey, snapshot);
    return snapshot;
  }

  const snapshot = await fetchHistoricalRate(fromCurrency, toCurrency, rateDate);
  setCachedSnapshot(cacheKey, snapshot);
  return snapshot;
};

export const resolveExpenseCurrencyFields = async (input: {
  amount: number;
  currency?: string;
  baseCurrency?: string;
  date: string;
  existing?: Pick<
    Expense,
    | 'currency'
    | 'baseCurrency'
    | 'exchangeRate'
    | 'exchangeRateDate'
    | 'exchangeRateFetchedAt'
    | 'exchangeRateProvider'
    | 'baseAmount'
  >;
  forceRefresh?: boolean;
}): Promise<ReturnType<typeof buildExpenseCurrencyFields>> => {
  const currency = normalizeCurrencyCode(input.currency || input.existing?.currency || DEFAULT_BASE_CURRENCY);
  const baseCurrency = normalizeCurrencyCode(input.baseCurrency || input.existing?.baseCurrency || DEFAULT_BASE_CURRENCY);

  if (
    !input.forceRefresh &&
    input.existing?.exchangeRate &&
    input.existing.exchangeRate > 0 &&
    normalizeCurrencyCode(input.existing.currency || currency) === currency &&
    normalizeCurrencyCode(input.existing.baseCurrency || baseCurrency) === baseCurrency
  ) {
    return buildExpenseCurrencyFields({
      amount: input.amount,
      currency,
      baseCurrency,
      exchangeRate: input.existing.exchangeRate,
      exchangeRateDate: input.existing.exchangeRateDate || input.date,
      exchangeRateFetchedAt: input.existing.exchangeRateFetchedAt,
      exchangeRateProvider: input.existing.exchangeRateProvider || PROVIDER_NAME,
      baseAmount: Math.round(input.amount * input.existing.exchangeRate * 100) / 100,
    });
  }

  const snapshot = await getHistoricalRate(currency, baseCurrency, input.date);

  return buildExpenseCurrencyFields({
    amount: input.amount,
    currency,
    baseCurrency,
    exchangeRate: snapshot.rate,
    exchangeRateDate: snapshot.rateDate,
    exchangeRateFetchedAt: snapshot.fetchedAt,
    exchangeRateProvider: snapshot.provider,
    baseAmount: Math.round(input.amount * snapshot.rate * 100) / 100,
  });
};

export const currencyRateService = {
  getHistoricalRate,
  resolveExpenseCurrencyFields,
};
