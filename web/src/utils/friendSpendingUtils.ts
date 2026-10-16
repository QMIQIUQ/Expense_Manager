import type {
  FriendSpendingPeriod,
  FriendSpendingSummary,
} from '../types/friendSpending';
import type { CurrencyCode } from '../types';
import { convertAmountToCurrency } from '../services/currencyRateService';
import { DEFAULT_BASE_CURRENCY } from './currencyUtils';
import { roundMoney } from '../domain/money';

export interface FriendSpendingDateRange {
  startDate?: string;
  endDate?: string;
}

export interface PresentedSpendingCategory {
  name: string;
  amount: number;
  currency: CurrencyCode;
  percentage: number;
}

export interface PresentedSpendingTotal {
  amount: number;
  currency: CurrencyCode;
}

export interface PresentedFriendSpending {
  totals: PresentedSpendingTotal[];
  categories: PresentedSpendingCategory[];
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const subtractCalendarMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setMonth(result.getMonth() - months);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), daysInTargetMonth));
  return result;
};

export const getFriendSpendingDateRange = (
  period: FriendSpendingPeriod,
  selectedDate: string,
  now = new Date()
): FriendSpendingDateRange => {
  const today = formatLocalDate(now);
  if (period === 'all') return {};
  if (period === 'day') return { startDate: selectedDate || today, endDate: selectedDate || today };
  if (period === 'current-month') {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }
  return { startDate: formatLocalDate(subtractCalendarMonths(now, 3)), endDate: today };
};

export const presentFriendSpending = async (
  summary: FriendSpendingSummary,
  displayCurrency?: CurrencyCode,
  rateDate = formatLocalDate(new Date())
): Promise<PresentedFriendSpending> => {
  const targetCurrency = displayCurrency || DEFAULT_BASE_CURRENCY;
  const sourceCurrencies = new Set<CurrencyCode>([
    ...summary.totalByCurrency.map(({ currency }) => currency),
    ...summary.categories.flatMap(({ amounts }) => amounts.map(({ currency }) => currency)),
  ]);
  const conversionRates = new Map<CurrencyCode, { currency: CurrencyCode; rate: number }>();

  await Promise.all([...sourceCurrencies].map(async (sourceCurrency) => {
    if (sourceCurrency === targetCurrency) {
      conversionRates.set(sourceCurrency, { currency: targetCurrency, rate: 1 });
      return;
    }
    try {
      const rate = await convertAmountToCurrency(1, sourceCurrency, targetCurrency, rateDate);
      conversionRates.set(sourceCurrency, { currency: targetCurrency, rate });
    } catch {
      conversionRates.set(sourceCurrency, { currency: sourceCurrency, rate: 1 });
    }
  }));

  const totalsByDisplayCurrency = new Map<CurrencyCode, number>();
  for (const item of summary.totalByCurrency) {
    const conversion = conversionRates.get(item.currency) || { currency: item.currency, rate: 1 };
    const total = totalsByDisplayCurrency.get(conversion.currency) || 0;
    totalsByDisplayCurrency.set(conversion.currency, total + item.amount * conversion.rate);
  }

  const categoryAmounts = new Map<string, { name: string; currency: CurrencyCode; amount: number }>();
  for (const category of summary.categories) {
    for (const item of category.amounts) {
      const conversion = conversionRates.get(item.currency) || { currency: item.currency, rate: 1 };
      const key = `${category.name}\u0000${conversion.currency}`;
      const current = categoryAmounts.get(key);
      categoryAmounts.set(key, {
        name: category.name,
        currency: conversion.currency,
        amount: (current?.amount || 0) + item.amount * conversion.rate,
      });
    }
  }

  const categoriesByCurrency = new Map<CurrencyCode, number>();
  for (const category of categoryAmounts.values()) {
    categoriesByCurrency.set(
      category.currency,
      (categoriesByCurrency.get(category.currency) || 0) + category.amount
    );
  }

  const categories = [...categoryAmounts.values()]
    .map((category) => {
      const total = categoriesByCurrency.get(category.currency) || 0;
      const currencyTotal = totalsByDisplayCurrency.get(category.currency) || total;
      const denominator = currencyTotal > 0 ? currencyTotal : total;
      return {
        ...category,
        amount: roundMoney(category.amount, category.currency),
        percentage: denominator > 0 ? (category.amount / denominator) * 100 : 0,
      };
    })
    .sort((left, right) => left.currency === right.currency
      ? right.amount - left.amount
      : left.currency.localeCompare(right.currency));

  const totals = [...totalsByDisplayCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount: roundMoney(amount, currency) }))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return { totals, categories };
};

\n