import type { Expense, Card, EWallet, Bank } from '../types';
import type { ExpenseFilterState, ExpensePeriodSelection } from '../types/expensePeriod';
import { formatDateLocal } from './dateUtils';
import { getExpenseBaseAmount } from './currencyUtils';

const parseLocalDate = (value: string): Date => new Date(`${value}T00:00:00`);

const startOfMonth = (value: string): string => {
  const date = parseLocalDate(value);
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth(), 1));
};

const endOfMonth = (value: string): string => {
  const date = parseLocalDate(value);
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

export const getExpensePeriodBounds = (
  period: ExpensePeriodSelection,
): { startDate: string; endDate: string } | null => {
  if (period.mode === 'all') return null;
  if (period.mode === 'day') {
    return { startDate: period.anchorDate, endDate: period.anchorDate };
  }
  if (period.mode === 'month') {
    return { startDate: startOfMonth(period.anchorDate), endDate: endOfMonth(period.anchorDate) };
  }
  if (period.mode === 'year') {
    const year = period.anchorDate.slice(0, 4);
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  return {
    startDate: period.startDate || period.anchorDate,
    endDate: period.endDate || period.startDate || period.anchorDate,
  };
};

export const filterExpensesByPeriod = (
  expenses: Expense[],
  period: ExpensePeriodSelection,
): Expense[] => {
  const bounds = getExpensePeriodBounds(period);
  if (!bounds) return expenses;
  return expenses.filter((expense) => expense.date >= bounds.startDate && expense.date <= bounds.endDate);
};

interface ExpenseFilterContext {
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
}

const getPaymentSourceName = (expense: Expense, context: ExpenseFilterContext): string => {
  if (expense.paymentMethod === 'credit_card') {
    return context.cards?.find((card) => card.id === expense.cardId)?.name || '';
  }
  if (expense.paymentMethod === 'e_wallet') {
    return expense.paymentMethodName
      || context.ewallets?.find((wallet) => wallet.id === expense.paymentMethodName)?.name
      || '';
  }
  if (expense.paymentMethod === 'bank') {
    return context.banks?.find((bank) => bank.id === expense.bankId)?.name || '';
  }
  return expense.paymentMethod || '';
};

export const filterAndSortExpenses = (
  expenses: Expense[],
  filters: ExpenseFilterState,
  context: ExpenseFilterContext = {},
): Expense[] => {
  const query = filters.query.trim().toLocaleLowerCase();
  const filtered = expenses.filter((expense) => {
    const searchable = [
      expense.description,
      expense.notes,
      expense.category,
      expense.paymentMethod,
      expense.paymentMethodName,
      getPaymentSourceName(expense, context),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();

    const matchesQuery = !query || searchable.includes(query);
    const matchesCategory = !filters.category || expense.category === filters.category;
    const matchesPayment = filters.paymentMethod === 'all' || expense.paymentMethod === filters.paymentMethod;
    return matchesQuery && matchesCategory && matchesPayment;
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === 'amount-desc') return getExpenseBaseAmount(right) - getExpenseBaseAmount(left);
    if (filters.sort === 'amount-asc') return getExpenseBaseAmount(left) - getExpenseBaseAmount(right);
    const leftTime = new Date(`${left.date}T${left.time || '00:00'}:00`).getTime();
    const rightTime = new Date(`${right.date}T${right.time || '00:00'}:00`).getTime();
    return filters.sort === 'date-asc' ? leftTime - rightTime : rightTime - leftTime;
  });
};

export const countInclusiveDays = (startDate: string, endDate: string): number => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const milliseconds = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(milliseconds / 86_400_000) + 1;
};
