import type { DashboardWidgetType } from '../../../types/dashboard';
import type { WidgetProps } from './types';

/** Actual render inputs, distinct from the collections needed for complete financial totals. */
export const widgetRenderDependencies: Record<DashboardWidgetType, (keyof WidgetProps)[]> = {
  'summary-cards': ['expenses', 'incomes', 'repayments', 'billingCycleDay', 'displayCurrency'],
  'expense-chart': ['expenses', 'categories', 'billingCycleDay', 'displayCurrency'],
  'spending-trend': ['expenses', 'billingCycleDay', 'displayCurrency'],
  'category-breakdown': ['expenses', 'categories', 'billingCycleDay', 'displayCurrency', 'onNavigateToExpenseCategory'],
  'recent-expenses': ['expenses', 'displayCurrency'],
  'budget-progress': ['budgets', 'expenses', 'repayments', 'billingCycleDay', 'displayCurrency'],
  'tracked-expenses': ['expenses', 'repayments', 'displayCurrency', 'onMarkTrackingCompleted', 'onNavigateToExpense'],
  'cards-summary': ['cards', 'categories', 'expenses'],
  'quick-add': ['categories', 'cards', 'ewallets', 'banks', 'quickExpensePresets', 'onQuickExpenseAdd', 'onQuickExpensePresetsChange', 'displayCurrency'],
  'pending-payments': ['scheduledPayments', 'scheduledPaymentRecords', 'categories', 'onConfirmScheduledPayment', 'displayCurrency'],
  'savings-goal': ['expenses', 'incomes', 'repayments', 'billingCycleDay'],
  'month-over-month': ['expenses', 'categories', 'displayCurrency'],
  'tag-cloud': ['expenses', 'billingCycleDay'],
  'upcoming-bills': ['scheduledPayments', 'scheduledPaymentRecords', 'displayCurrency'],
  'installment-tracker': ['scheduledPayments', 'scheduledPaymentRecords', 'displayCurrency'],
  'friend-spending': ['displayCurrency'],
};
