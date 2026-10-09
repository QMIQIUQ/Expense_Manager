import type { Budget, CurrencyCode } from '../types';
import { DEFAULT_BASE_CURRENCY, formatMoney, normalizeCurrencyCode } from './currencyUtils';
import { roundMoney } from '../domain/money';

type BudgetCurrencyFields = Pick<Budget, 'currency' | 'exchangeRate'>;

export const getBudgetCurrency = (budget: Pick<Budget, 'currency'>): CurrencyCode =>
  normalizeCurrencyCode(budget.currency || DEFAULT_BASE_CURRENCY);

export const getBudgetExchangeRate = (budget: BudgetCurrencyFields): number => {
  const currency = getBudgetCurrency(budget);
  if (currency === DEFAULT_BASE_CURRENCY) return 1;

  const rate = budget.exchangeRate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : Number.NaN;
};

export const toBudgetBaseAmount = (amount: number, budget: BudgetCurrencyFields): number =>
  roundMoney(amount * getBudgetExchangeRate(budget), DEFAULT_BASE_CURRENCY);

export const toBudgetCurrencyAmount = (baseAmount: number, budget: BudgetCurrencyFields): number =>
  roundMoney(baseAmount / getBudgetExchangeRate(budget), getBudgetCurrency(budget));

export const convertBudgetAmount = (
  amount: number,
  fromBudget: BudgetCurrencyFields,
  toBudget: BudgetCurrencyFields,
): number => toBudgetCurrencyAmount(toBudgetBaseAmount(amount, fromBudget), toBudget);

export const formatBudgetMoney = (amount: number, budget: Pick<Budget, 'currency'>): string =>
  formatMoney(amount, getBudgetCurrency(budget));
