import React, { lazy, Suspense } from 'react';
import { DashboardWidget, DashboardWidgetType, WIDGET_METADATA, WidgetSize } from '../../../types/dashboard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TranslationKey } from '../../../locales/translations';
import { WidgetProps } from './types';
import SummaryCardsWidget from './SummaryCardsWidget';
const ExpenseChartWidget = lazy(() => import('./ExpenseChartWidget'));
const SpendingTrendWidget = lazy(() => import('./SpendingTrendWidget'));
import CategoryBreakdownWidget from './CategoryBreakdownWidget';
import RecentExpensesWidget from './RecentExpensesWidget';
import BudgetProgressWidget from './BudgetProgressWidget';
import TrackedExpensesWidget from './TrackedExpensesWidget';
import CardsSummaryWidget from './CardsSummaryWidget';
import QuickAddWidget from './QuickAddWidget';
import PendingPaymentsWidget from './PendingPaymentsWidget';
import SavingsGoalWidget from './SavingsGoalWidget';
import MonthOverMonthWidget from './MonthOverMonthWidget';
import TagCloudWidget from './TagCloudWidget';
import UpcomingBillsWidget from './UpcomingBillsWidget';
import InstallmentTrackerWidget from './InstallmentTrackerWidget';
import FriendSpendingWidget from './FriendSpendingWidget';
import { widgetDataComplete, widgetFinancialDependencies } from './completeness';
import { widgetRenderDependencies } from './renderDependencies';
import FeatureLoadBoundary from '../../common/FeatureLoadBoundary';

// Re-export WidgetProps for backward compatibility
export type { WidgetProps } from './types';

interface WidgetContainerProps {
  widget: DashboardWidget;
  data: WidgetProps;
  isEditing?: boolean;
  onToggle?: (widgetId: string, enabled: boolean) => void;
  onMoveUp?: (widgetId: string) => void;
  onMoveDown?: (widgetId: string) => void;
  onNavigateToExpenses?: () => void;
  onNavigateToExpenseMonth?: (month: string) => void;
  onNavigateToExpense?: (expenseId: string) => void;
  onNavigateToScheduledPayment?: (scheduledPaymentId: string) => void;
  onNavigateToIncomes?: () => void;
  onNavigateToBudgets?: () => void;
  onNavigateToPaymentMethods?: () => void;
}

// Get CSS class for widget size
const getSizeClass = (size: WidgetSize): string => {
  switch (size) {
    case 'small':
      return 'widget-small';
    case 'medium':
      return 'widget-medium';
    case 'large':
      return 'widget-large';
    case 'full':
      return 'widget-full';
    default:
      return 'widget-medium';
  }
};

// Render appropriate widget component based on type
const renderWidget = (
  type: DashboardWidgetType, 
  data: WidgetProps, 
  size: WidgetSize,
  onNavigateToExpenses?: () => void,
  onNavigateToExpense?: (expenseId: string) => void,
  onNavigateToScheduledPayment?: (scheduledPaymentId: string) => void,
  onNavigateToIncomes?: () => void,
  onNavigateToBudgets?: () => void,
  onNavigateToPaymentMethods?: () => void,
  onNavigateToExpenseMonth?: (month: string) => void
): React.ReactNode => {
  const propsWithSize = { ...data, size };
  switch (type) {
    case 'summary-cards':
      return <SummaryCardsWidget {...propsWithSize} onNavigateToExpenses={onNavigateToExpenses} onNavigateToIncomes={onNavigateToIncomes} />;
    case 'expense-chart':
      return <ExpenseChartWidget {...propsWithSize} />;
    case 'spending-trend':
      return <SpendingTrendWidget {...propsWithSize} />;
    case 'category-breakdown':
      return <CategoryBreakdownWidget {...propsWithSize} />;
    case 'recent-expenses':
      return <RecentExpensesWidget {...propsWithSize} onViewAll={onNavigateToExpenses} onNavigateToExpense={onNavigateToExpense} />;
    case 'budget-progress':
      return <BudgetProgressWidget {...propsWithSize} onNavigateToBudgets={onNavigateToBudgets} />;
    case 'tracked-expenses':
      return <TrackedExpensesWidget {...propsWithSize} />;
    case 'cards-summary':
      return <CardsSummaryWidget {...propsWithSize} onNavigateToPaymentMethods={onNavigateToPaymentMethods} />;
    case 'quick-add':
      return <QuickAddWidget {...propsWithSize} />;
    case 'pending-payments':
      return <PendingPaymentsWidget {...propsWithSize} onNavigateToScheduledPayment={onNavigateToScheduledPayment} />;
    case 'savings-goal':
      return <SavingsGoalWidget {...propsWithSize} />;
    case 'month-over-month':
      return <MonthOverMonthWidget {...propsWithSize} onNavigateToExpenseMonth={onNavigateToExpenseMonth} />;
    case 'tag-cloud':
      return <TagCloudWidget {...propsWithSize} onNavigateToExpenses={onNavigateToExpenses} />;
    case 'upcoming-bills':
      return <UpcomingBillsWidget {...propsWithSize} onNavigateToScheduledPayment={onNavigateToScheduledPayment} />;
    case 'installment-tracker':
      return <InstallmentTrackerWidget {...propsWithSize} onNavigateToScheduledPayment={onNavigateToScheduledPayment} />;
    case 'friend-spending':
      return <FriendSpendingWidget {...propsWithSize} />;
    default:
      return null;
  }
};

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  data,
  isEditing = false,
  onToggle,
  onMoveUp,
  onMoveDown,
  onNavigateToExpenses,
  onNavigateToExpenseMonth,
  onNavigateToExpense,
  onNavigateToScheduledPayment,
  onNavigateToIncomes,
  onNavigateToBudgets,
  onNavigateToPaymentMethods,
}) => {
  const { t } = useLanguage();
  const metadata = WIDGET_METADATA[widget.type];

  // Handle invalid widget type
  if (!metadata) {
    console.error(`Invalid widget type: ${widget.type}`);
    return null;
  }

  if (!widget.enabled && !isEditing) {
    return null;
  }

  const widgetTitle = widget.title || t(metadata.defaultTitle as TranslationKey) || metadata.defaultTitleFallback;
  
  // Use the widget's configured size
  const effectiveSize = widget.size;

  return (
    <div
      className={`widget-container ${getSizeClass(effectiveSize)} ${!widget.enabled ? 'widget-disabled' : ''}`}
      style={{
        opacity: widget.enabled ? 1 : 0.5,
        position: 'relative',
      }}
    >
      {isEditing && (
        <div className="widget-edit-controls">
          <div className="widget-drag-handle" title={t('dragToReorder') || 'Drag to reorder'}>
            ⋮⋮
          </div>
          <div className="widget-actions">
            <button
              onClick={() => onMoveUp?.(widget.id)}
              className="widget-action-btn"
              title={t('moveUp')}
            >
              ↑
            </button>
            <button
              onClick={() => onMoveDown?.(widget.id)}
              className="widget-action-btn"
              title={t('moveDown')}
            >
              ↓
            </button>
            <button
              onClick={() => onToggle?.(widget.id, !widget.enabled)}
              className={`widget-action-btn ${widget.enabled ? 'widget-visible' : 'widget-hidden'}`}
              title={widget.enabled ? t('hide') : t('show')}
            >
              {widget.enabled ? '👁' : '👁‍🗨'}
            </button>
          </div>
        </div>
      )}

      {widget.type !== 'summary-cards' && (
        <div className="widget-header">
          <span className="widget-icon">{metadata.icon}</span>
          <h3 className="widget-title">{widgetTitle}</h3>
        </div>
      )}

      <div className="widget-content">
        <FeatureLoadBoundary>
        <Suspense fallback={<p role="status">{t('loading')}</p>}>
        {widget.enabled && !widgetDataComplete(widget.type, data.completeness ?? {}) ? <p role="status">{t('incompleteFinancialData')}</p> : widget.enabled ? (
          renderWidget(widget.type, data, effectiveSize, onNavigateToExpenses, onNavigateToExpense, onNavigateToScheduledPayment, onNavigateToIncomes, onNavigateToBudgets, onNavigateToPaymentMethods, onNavigateToExpenseMonth)
        ) : (
          <div className="widget-placeholder">
            <span className="widget-placeholder-icon">{metadata.icon}</span>
            <span className="widget-placeholder-text">{t('widgetHidden')}</span>
          </div>
        )}
        </Suspense>
        </FeatureLoadBoundary>
      </div>
    </div>
  );
};

const navigationDependencies: Partial<Record<DashboardWidgetType, (keyof WidgetContainerProps)[]>> = {
  'summary-cards': ['onNavigateToExpenses', 'onNavigateToIncomes'],
  'recent-expenses': ['onNavigateToExpenses', 'onNavigateToExpense'],
  'budget-progress': ['onNavigateToBudgets'],
  'tracked-expenses': ['onNavigateToExpense'],
  'cards-summary': ['onNavigateToPaymentMethods'],
  'month-over-month': ['onNavigateToExpenseMonth'],
  'tag-cloud': ['onNavigateToExpenses'],
  'pending-payments': ['onNavigateToScheduledPayment'],
  'upcoming-bills': ['onNavigateToScheduledPayment'],
  'installment-tracker': ['onNavigateToScheduledPayment'],
};
export const widgetPropsEqual = (previous: WidgetContainerProps, next: WidgetContainerProps): boolean => {
  if (previous.widget !== next.widget || previous.isEditing !== next.isEditing) return false;
  const type = next.widget.type;
  const fields = widgetRenderDependencies[type];
  if (!fields || fields.some((key) => previous.data[key] !== next.data[key])) return false;
  if ((widgetFinancialDependencies[type] ?? []).some((key) => previous.data.completeness?.[key] !== next.data.completeness?.[key])) return false;
  const callbacks = [...(navigationDependencies[type] ?? []), ...(next.isEditing ? ['onToggle', 'onMoveUp', 'onMoveDown'] as const : [])];
  return callbacks.every((key) => previous[key] === next[key]);
};
export default React.memo(WidgetContainer, widgetPropsEqual);
