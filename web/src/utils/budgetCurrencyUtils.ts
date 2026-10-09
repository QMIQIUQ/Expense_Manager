import type { Budget, CurrencyCode } from '../types';
import { DEFAULT_BASE_CURRENCY, formatMoney, normalizeCurrencyCode } from './currencyUtils';

type BudgetCurrencyFields = Pick<Budget, 'currency' | 'exchangeRate'>;

export const getBudgetCurrency = (budget: Pick<Budget, 'currency'>): CurrencyCode =>
  normalizeCurrencyCode(budget.currency || DEFAULT_BASE_CURRENCY);

export const getBudgetExchangeRate = (budget: BudgetCurrencyFields): number => {
  const currency = getBudgetCurrency(budget);
  if (currency === DEFAULT_BASE_CURRENCY) return 1;

  const rate = budget.exchangeRate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : 1;
};

export const toBudgetBaseAmount = (amount: number, budget: BudgetCurrencyFields): number =>
  Math.round(amount * getBudgetExchangeRate(budget) * 100) / 100;

export const toBudgetCurrencyAmount = (baseAmount: number, budget: BudgetCurrencyFields): number =>
  Math.round((baseAmount / getBudgetExchangeRate(budget)) * 100) / 100;

export const convertBudgetAmount = (
  amount: number,
  fromBudget: BudgetCurrencyFields,
  toBudget: BudgetCurrencyFields,
): number => toBudgetCurrencyAmount(toBudgetBaseAmount(amount, fromBudget), toBudget);

export const formatBudgetMoney = (amount: number, budget: Pick<Budget, 'currency'>): string =>
  formatMoney(amount, getBudgetCurrency(budget));
