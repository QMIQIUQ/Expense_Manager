import React from 'react';
import { DashboardWidget, DashboardWidgetType, WIDGET_METADATA, WidgetSize } from '../../../types/dashboard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TranslationKey } from '../../../locales/translations';
import { WidgetProps } from './types';
import SummaryCardsWidget from './SummaryCardsWidget';
import ExpenseChartWidget from './ExpenseChartWidget';
import SpendingTrendWidget from './SpendingTrendWidget';
import CategoryBreakdownWidget from './CategoryBreakdownWidget';
import RecentExpensesWidget from './RecentExpensesWidget';
import BudgetProgressWidget from './BudgetProgressWidget';
import TrackedExpensesWidget from './TrackedExpensesWidget';
import CardsSummaryWidget from './CardsSummaryWidget';
import QuickAddWidget from './QuickAddWidget';
import PendingPaymentsWidget from './PendingPaymentsWidget';

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
  onNavigateToExpenses?: () => void
): React.ReactNode => {
  const propsWithSize = { ...data, size };
  switch (type) {
    case 'summary-cards':
      return <SummaryCardsWidget {...propsWithSize} />;
    case 'expense-chart':
      return <ExpenseChartWidget {...propsWithSize} />;
    case 'spending-trend':
      return <SpendingTrendWidget {...propsWithSize} />;
    case 'category-breakdown':
      return <CategoryBreakdownWidget {...propsWithSize} />;
    case 'recent-expenses':
      return <RecentExpensesWidget {...propsWithSize} onViewAll={onNavigateToExpenses} />;
    case 'budget-progress':
      return <BudgetProgressWidget {...propsWithSize} />;
    case 'tracked-expenses':
      return <TrackedExpensesWidget {...propsWithSize} />;
    case 'cards-summary':
      return <CardsSummaryWidget {...propsWithSize} />;
    case 'quick-add':
      return <QuickAddWidget {...propsWithSize} />;
    case 'pending-payments':
      return <PendingPaymentsWidget {...propsWithSize} />;
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
}) => {
  const { t } = useLanguage();
  const metadata = WIDGET_METADATA[widget.type];

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
        {widget.enabled ? (
          renderWidget(widget.type, data, effectiveSize, onNavigateToExpenses)
        ) : (
          <div className="widget-placeholder">
            <span className="widget-placeholder-icon">{metadata.icon}</span>
            <span className="widget-placeholder-text">{t('widgetHidden')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetContainer;
