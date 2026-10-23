import type { DashboardWidgetType } from '../../../types/dashboard';
import type { CacheableEntity } from '../../../utils/sessionCache';
export type WidgetCompleteness = Partial<Record<CacheableEntity, boolean>>;
export const widgetFinancialDependencies: Partial<Record<DashboardWidgetType, CacheableEntity[]>> = {
  // This widget explicitly reads and verifies its own complete historical scope.
  'spending-anomaly': [],
  'summary-cards': ['expenses', 'incomes', 'repayments', 'receivableExpenses', 'userSettings'],
  'expense-chart': ['expenses', 'repayments', 'userSettings'],
  'spending-trend': ['expenses', 'repayments', 'userSettings'],
  'category-breakdown': ['expenses', 'repayments', 'userSettings'],
  'budget-progress': ['expenses', 'repayments', 'budgets', 'userSettings'],
  'cards-summary': ['expenses', 'repayments', 'cards', 'userSettings'],
  'tracked-expenses': ['expenses', 'repayments', 'receivableExpenses'],
  'savings-goal': ['expenses', 'incomes', 'repayments', 'userSettings'],
  'month-over-month': ['expenses', 'repayments', 'userSettings'],
  'tag-cloud': ['expenses', 'userSettings'],
  'pending-payments': ['scheduledPayments', 'scheduledPaymentRecords'],
  'upcoming-bills': ['scheduledPayments', 'scheduledPaymentRecords'],
  'installment-tracker': ['scheduledPayments', 'scheduledPaymentRecords'],
};
export const widgetDataComplete = (type: DashboardWidgetType, completeness: WidgetCompleteness): boolean =>
  (widgetFinancialDependencies[type] ?? []).every((entity) => completeness[entity] === true);
