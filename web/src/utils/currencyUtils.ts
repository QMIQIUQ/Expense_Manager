import type { CurrencyCode, CurrencyOption, Expense } from '../types';
import { getCurrencyMinorDigits, roundMoney } from '../domain/money';

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
  const option = getCurrencyOption(currencyCode);
  const digits = getCurrencyMinorDigits(option.code);
  return `${option.symbol}${Number.isFinite(amount) ? amount.toFixed(digits) : '—'}`;
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
  expense: Pick<Expense, 'amount' | 'currency'> & Partial<Pick<Expense, 'baseAmount' | 'exchangeRate'>>
): number => {
  if (typeof expense.baseAmount === 'number' && Number.isFinite(expense.baseAmount)) {
    return expense.baseAmount;
  }
  if (typeof expense.exchangeRate === 'number' && Number.isFinite(expense.exchangeRate) && expense.exchangeRate > 0) {
    return roundMoney(expense.amount * expense.exchangeRate, 'MYR');
  }
  // Legacy records without currency metadata are MYR. A foreign amount without
  // its booked valuation is intentionally not presented as a MYR amount.
  if ('currency' in expense && expense.currency && normalizeCurrencyCode(expense.currency) !== DEFAULT_BASE_CURRENCY) {
    return Number.NaN;
  }
  return expense.amount;
};

export const getCurrencyBaseAmount = (record: {
  amount: number;
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: number;
  baseAmount?: number;
}): number => {
  const currency = normalizeCurrencyCode(record.currency);
  const baseCurrency = normalizeCurrencyCode(record.baseCurrency || DEFAULT_BASE_CURRENCY);
  if (typeof record.baseAmount === 'number' && Number.isFinite(record.baseAmount)) return record.baseAmount;
  if (currency === baseCurrency) return record.amount;
  if (typeof record.exchangeRate === 'number' && Number.isFinite(record.exchangeRate) && record.exchangeRate > 0) {
    return roundMoney(record.amount * record.exchangeRate, baseCurrency);
  }
  return Number.NaN;
};

export const getIncomeBaseAmount = getCurrencyBaseAmount;
export const getRepaymentBaseAmount = getCurrencyBaseAmount;

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

  const baseAmount = getExpenseBaseAmount(expense);
  return { amount: baseAmount, sourceCurrency: baseCurrency };
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
  if (currency !== baseCurrency && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
    throw new Error(`A valid ${currency} to ${baseCurrency} exchange rate is required`);
  }
  const exchangeRateDate = params.exchangeRateDate || new Date().toISOString().split('T')[0];
  const exchangeRateFetchedAt = params.exchangeRateFetchedAt || new Date();
  const exchangeRateProvider = params.exchangeRateProvider || 'local';
  const baseAmount =
    typeof params.baseAmount === 'number' && Number.isFinite(params.baseAmount)
      ? params.baseAmount
      : roundMoney(params.amount * exchangeRate, baseCurrency);

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
