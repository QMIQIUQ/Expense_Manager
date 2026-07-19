export type ExpensePeriodMode = 'all' | 'day' | 'month' | 'year' | 'range';

export interface ExpensePeriodSelection {
  mode: ExpensePeriodMode;
  /** Anchor used by day/month/year navigation and when leaving "all" mode. */
  anchorDate: string;
  /** Inclusive range boundaries. Required when mode is "range". */
  startDate?: string;
  endDate?: string;
}

export type ExpenseSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export type ExpensePaymentFilter = 'all' | 'cash' | 'credit_card' | 'e_wallet' | 'bank';

export interface ExpenseFilterState {
  query: string;
  category: string;
  paymentMethod: ExpensePaymentFilter;
  sort: ExpenseSort;
}

export const DEFAULT_EXPENSE_FILTERS: ExpenseFilterState = {
  query: '',
  category: '',
  paymentMethod: 'all',
  sort: 'date-desc',
};
