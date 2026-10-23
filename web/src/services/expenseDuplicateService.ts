import { readCompleteExpensePeriod } from './expensePeriodReadService';
import { findExpenseDuplicates, type DuplicateExpenseInput } from '../utils/expenseDuplicateCandidates';
import { applyPendingOperations } from '../utils/pendingOperations';
import type { Expense } from '../types';

export interface DuplicateReview { candidates: Expense[]; complete: boolean }
export const reviewExpenseDuplicates = async (userId: string, input: DuplicateExpenseInput): Promise<DuplicateReview> => {
  try {
    const snapshot = await readCompleteExpensePeriod(userId, { startDate: input.date, endDate: input.date });
    return { candidates: findExpenseDuplicates(userId, input, applyPendingOperations('expenses', userId, snapshot.rows)), complete: true };
  } catch {
    // A failed/incomplete scope must never be advertised as "no duplicates".
    return { candidates: findExpenseDuplicates(userId, input, applyPendingOperations<Expense[]>('expenses', userId, [])), complete: false };
  }
};
