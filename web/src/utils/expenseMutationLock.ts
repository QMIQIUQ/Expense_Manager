const mutationTails = new Map<string, Promise<void>>();
const failedExpenseCreates = new Set<string>();
const deletedExpenses = new Set<string>();
const deletingExpenses = new Set<string>();

const getExpenseKey = (userId: string, expenseId: string): string => JSON.stringify([userId, expenseId]);

const notifyExpenseVisibilityChanged = (userId: string): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('expense-visibility-changed', { detail: { userId } }));
  }
};

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
  const key = getExpenseKey(userId, expenseId);
  const wasDeleting = deletingExpenses.delete(key);
  const wasDeleted = deletedExpenses.has(key);
  deletedExpenses.add(key);
  if (wasDeleting || !wasDeleted) notifyExpenseVisibilityChanged(userId);
};

export const hasExpenseBeenDeleted = (userId: string, expenseId: string): boolean => {
  return deletedExpenses.has(getExpenseKey(userId, expenseId));
};

export const markExpenseDeletionInProgress = (userId: string, expenseId: string): void => {
  const key = getExpenseKey(userId, expenseId);
  if (deletedExpenses.has(key) || deletingExpenses.has(key)) return;
  deletingExpenses.add(key);
  notifyExpenseVisibilityChanged(userId);
};

export const clearExpenseDeletionInProgress = (userId: string, expenseId: string): void => {
  if (deletingExpenses.delete(getExpenseKey(userId, expenseId))) notifyExpenseVisibilityChanged(userId);
};

export const hasExpenseDeletionInProgress = (userId: string, expenseId: string): boolean => {
  return deletingExpenses.has(getExpenseKey(userId, expenseId));
};

export const getHiddenExpenseIds = (userId: string): Set<string> => {
  const prefix = `[${JSON.stringify(userId)},`;
  const hidden = new Set<string>();
  for (const key of [...deletedExpenses, ...deletingExpenses]) {
    if (!key.startsWith(prefix)) continue;
    try {
      const parsed = JSON.parse(key) as [string, string];
      if (parsed[0] === userId) hidden.add(parsed[1]);
    } catch { /* Ignore malformed in-memory keys. */ }
  }
  return hidden;
};
