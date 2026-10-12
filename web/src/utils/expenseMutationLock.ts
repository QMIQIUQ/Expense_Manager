const mutationTails = new Map<string, Promise<void>>();
const failedExpenseCreates = new Set<string>();
const deletedExpenses = new Set<string>();

const getExpenseKey = (userId: string, expenseId: string): string => JSON.stringify([userId, expenseId]);

export const withExpenseMutationLock = async <T,>(
  userId: string,
  expenseId: string,
  mutation: () => Promise<T>,
): Promise<T> => {
  const key = getExpenseKey(userId, expenseId);
  const previous = mutationTails.get(key);
  let releaseMutation!: () => void;
  const current = new Promise<void>((resolve) => { releaseMutation = resolve; });
  mutationTails.set(key, current);

  if (previous) await previous;
  try {
    return await mutation();
  } finally {
    releaseMutation();
    if (mutationTails.get(key) === current) mutationTails.delete(key);
  }
};

export const markExpenseCreateFailed = (userId: string, expenseId: string): void => {
  failedExpenseCreates.add(getExpenseKey(userId, expenseId));
};

export const clearExpenseCreateFailure = (userId: string, expenseId: string): void => {
  failedExpenseCreates.delete(getExpenseKey(userId, expenseId));
};

export const hasExpenseCreateFailed = (userId: string, expenseId: string): boolean => {
  return failedExpenseCreates.has(getExpenseKey(userId, expenseId));
};

export const markExpenseDeleted = (userId: string, expenseId: string): void => {
  deletedExpenses.add(getExpenseKey(userId, expenseId));
};

export const hasExpenseBeenDeleted = (userId: string, expenseId: string): boolean => {
  return deletedExpenses.has(getExpenseKey(userId, expenseId));
};
