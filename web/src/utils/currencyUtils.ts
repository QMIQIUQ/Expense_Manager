import type { CurrencyCode, CurrencyOption, Expense } from '../types';

export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'MYR';

export const CURRENCIES: CurrencyOption[] = [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

export const normalizeCurrencyCode = (currency?: string | null): CurrencyCode => {
  const normalized = (currency || DEFAULT_BASE_CURRENCY).toUpperCase();
  const match = CURRENCIES.find((item) => item.code === normalized);
  return (match?.code || DEFAULT_BASE_CURRENCY) as CurrencyCode;
};

export const getCurrencyOption = (currency?: string | null): CurrencyOption => {
  const code = normalizeCurrencyCode(currency);
  return CURRENCIES.find((item) => item.code === code) || CURRENCIES[0];
};

export const getCurrencySymbol = (currencyCode?: string | null): string => {
  return getCurrencyOption(currencyCode).symbol;
};

export const formatMoney = (amount: number, currencyCode?: string | null): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};

export const formatExchangeRate = (rate: number): string => {
  if (!Number.isFinite(rate)) return '0';
  const text = rate.toFixed(6);
  return text.replace(/\.?0+$/, '');
};

export const formatMoneyWithConversion = (
  amount: number,
  currencyCode: string | null | undefined,
  baseAmount?: number | null,
  baseCurrency: string | null | undefined = DEFAULT_BASE_CURRENCY,
  exchangeRate?: number | null
): string => {
  const original = formatMoney(amount, currencyCode);
  if (baseAmount == null) return original;

  const converted = formatMoney(baseAmount, baseCurrency);
  if (exchangeRate == null || !Number.isFinite(exchangeRate)) {
    return `${original} ≈ ${converted}`;
  }

  return `${original} ≈ ${converted} @ ${formatExchangeRate(exchangeRate)}`;
};

export const getExpenseCurrency = (expense: Pick<Expense, 'currency' | 'baseCurrency'>): CurrencyCode => {
  return normalizeCurrencyCode(expense.currency || expense.baseCurrency || DEFAULT_BASE_CURRENCY);
};

export const getExpenseBaseCurrency = (expense: Pick<Expense, 'baseCurrency'>): CurrencyCode => {
  return normalizeCurrencyCode(expense.baseCurrency || DEFAULT_BASE_CURRENCY);
};

export const getExpenseBaseAmount = (
  expense: Pick<Expense, 'amount' | 'baseAmount'>
): number => {
  if (typeof expense.baseAmount === 'number' && Number.isFinite(expense.baseAmount)) {
    return expense.baseAmount;
  }
  return expense.amount;
};

export const getExpenseDisplaySource = (
  expense: Pick<Expense, 'amount' | 'currency' | 'baseAmount' | 'baseCurrency'>,
  targetCurrency?: string | null
): { amount: number; sourceCurrency: CurrencyCode } => {
  const originalCurrency = getExpenseCurrency(expense);
  const baseCurrency = getExpenseBaseCurrency(expense);
  const target = targetCurrency ? normalizeCurrencyCode(targetCurrency) : baseCurrency;

  if (target === originalCurrency) {
    return { amount: expense.amount, sourceCurrency: originalCurrency };
  }

  if (target === baseCurrency) {
    return { amount: getExpenseBaseAmount(expense), sourceCurrency: baseCurrency };
  }

  return { amount: getExpenseBaseAmount(expense), sourceCurrency: baseCurrency };
};

export const buildExpenseCurrencyFields = (params: {
  amount: number;
  currency?: string | null;
  baseCurrency?: string | null;
  exchangeRate?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateFetchedAt?: Date | null;
  exchangeRateProvider?: string | null;
  baseAmount?: number | null;
}): {
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  exchangeRate: number;
  exchangeRateDate: string;
  exchangeRateFetchedAt: Date;
  exchangeRateProvider: string;
  baseAmount: number;
} => {
  const currency = normalizeCurrencyCode(params.currency);
  const baseCurrency = normalizeCurrencyCode(params.baseCurrency || DEFAULT_BASE_CURRENCY);
  const exchangeRate = params.exchangeRate ?? (currency === baseCurrency ? 1 : 0);
  const exchangeRateDate = params.exchangeRateDate || new Date().toISOString().split('T')[0];
  const exchangeRateFetchedAt = params.exchangeRateFetchedAt || new Date();
  const exchangeRateProvider = params.exchangeRateProvider || 'local';
  const baseAmount =
    typeof params.baseAmount === 'number' && Number.isFinite(params.baseAmount)
      ? params.baseAmount
      : Math.round(params.amount * exchangeRate * 100) / 100;

  return {
    currency,
    baseCurrency,
    exchangeRate,
    exchangeRateDate,
    exchangeRateFetchedAt,
    exchangeRateProvider,
    baseAmount,
  };
};
