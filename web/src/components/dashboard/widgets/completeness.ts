import type { DashboardWidgetType } from '../../../types/dashboard';
import type { CacheableEntity } from '../../../utils/sessionCache';
export type WidgetCompleteness = Partial<Record<CacheableEntity, boolean>>;
export const widgetFinancialDependencies: Partial<Record<DashboardWidgetType, CacheableEntity[]>> = {
  'summary-cards': ['expenses', 'incomes', 'repayments', 'userSettings'],
  'expense-chart': ['expenses', 'repayments', 'userSettings'],
  'spending-trend': ['expenses', 'repayments', 'userSettings'],
  'category-breakdown': ['expenses', 'repayments', 'userSettings'],
  'budget-progress': ['expenses', 'repayments', 'budgets', 'userSettings'],
  'cards-summary': ['expenses', 'repayments', 'cards', 'userSettings'],
  'tracked-expenses': ['expenses', 'repayments'],
  'savings-goal': ['expenses', 'incomes', 'repayments', 'userSettings'],
  'month-over-month': ['expenses', 'repayments', 'userSettings'],
  'tag-cloud': ['expenses', 'userSettings'],
  'pending-payments': ['scheduledPayments', 'scheduledPaymentRecords'],
  'upcoming-bills': ['scheduledPayments', 'scheduledPaymentRecords'],
  'installment-tracker': ['scheduledPayments', 'scheduledPaymentRecords'],
};
export const widgetDataComplete = (type: DashboardWidgetType, completeness: WidgetCompleteness): boolean =>
  (widgetFinancialDependencies[type] ?? []).every((entity) => completeness[entity] === true);
