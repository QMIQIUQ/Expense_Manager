// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
  RECURRING_EXPENSES: 'recurringExpenses',
} as const;

// User-related collections that should be deleted when a user is deleted
export const USER_DATA_COLLECTIONS = [
  COLLECTIONS.EXPENSES,
  COLLECTIONS.CATEGORIES,
  COLLECTIONS.BUDGETS,
  COLLECTIONS.RECURRING_EXPENSES,
] as const;
