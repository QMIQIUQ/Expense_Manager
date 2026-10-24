import type { Expense, Card, EWallet, Bank, ExpenseTag } from '../types';
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

/** Temporarily pins one owner-scoped dashboard target ahead of the current result set. */
export const includeFocusedExpense = (
  rows: Expense[],
  availableRows: Expense[],
  focusExpenseId: string | undefined,
  userId: string | undefined,
): Expense[] => {
  if (!focusExpenseId || !userId) return rows;
  const focusedExpense = rows.find((expense) => expense.id === focusExpenseId && expense.userId === userId)
    ?? availableRows.find((expense) => expense.id === focusExpenseId && expense.userId === userId);
  const remainingRows = rows.filter((expense) => expense.id !== focusExpenseId);
  return focusedExpense ? [focusedExpense, ...remainingRows] : remainingRows;
};

interface ExpenseFilterContext {
  tags?: ExpenseTag[];
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

export const filterExpenses = (
  expenses: Expense[],
  filters: ExpenseFilterState,
  context: ExpenseFilterContext = {},
): Expense[] => {
  const query = filters.query.trim().toLocaleLowerCase();
  return expenses.filter((expense) => {
    if (filters.tagId && !expense.tagIds?.includes(filters.tagId)) return false;
    if (filters.accountKey && filters.accountKey !== `${expense.paymentMethod}:${expense.bankId || expense.cardId || expense.paymentMethodName || ''}`) return false;
    if (filters.category && expense.category !== filters.category) return false;
    if (filters.paymentMethod !== 'all' && expense.paymentMethod !== filters.paymentMethod) return false;
    if (!query) return true;
    const searchable = [
      expense.description,
      expense.notes,
      expense.category,
      expense.paymentMethod,
      expense.paymentMethodName,
      getPaymentSourceName(expense, context),
      ...(expense.tagIds ?? []).map((id) => context.tags?.find((tag) => tag.id === id)?.name || ''),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();

    return searchable.includes(query);
  });
};

export const filterAndSortExpenses = (
  expenses: Expense[], filters: ExpenseFilterState, context: ExpenseFilterContext = {},
): Expense[] => filterExpenses(expenses, filters, context).sort((left, right) => {
    if (filters.sort === 'amount-desc') return getExpenseBaseAmount(right) - getExpenseBaseAmount(left);
    if (filters.sort === 'amount-asc') return getExpenseBaseAmount(left) - getExpenseBaseAmount(right);
    const order = left.date.localeCompare(right.date) || (left.time || '00:00').localeCompare(right.time || '00:00');
    return filters.sort === 'date-asc' ? order : -order;
  });

export const countInclusiveDays = (startDate: string, endDate: string): number => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const milliseconds = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(milliseconds / 86_400_000) + 1;
};
