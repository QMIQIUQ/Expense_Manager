import type { Expense } from '../types';
import { requireCurrencyCode, toMinorUnits } from '../domain/money';

export type DuplicateExpenseInput = Pick<Expense, 'date' | 'amount' | 'currency' | 'description'>;
export const normalizeExpenseDescription = (text: string): string => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export const findExpenseDuplicates = (userId: string, input: DuplicateExpenseInput, rows: Expense[]): Expense[] => {
  const currency = requireCurrencyCode(input.currency);
  const amount = toMinorUnits(input.amount, currency);
  const description = normalizeExpenseDescription(input.description);
  return rows.filter((row) => row.userId === userId && row.date === input.date &&
    requireCurrencyCode(row.currency) === currency && toMinorUnits(row.amount, currency) === amount &&
    normalizeExpenseDescription(row.description) === description);
};
