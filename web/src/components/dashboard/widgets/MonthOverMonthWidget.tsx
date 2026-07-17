import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getTodayLocal } from '../../../utils/dateUtils';
import { WidgetProps } from './types';

const getPreviousMonthKey = (monthKey: string): string => {
  const date = new Date(`${monthKey}-01T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const MonthOverMonthWidget: React.FC<WidgetProps> = ({
  expenses,
  size = 'medium',
  onNavigateToExpenseMonth,
}) => {
  const { t } = useLanguage();
  const isCompact = size === 'small';
  const currentMonth = getTodayLocal().slice(0, 7);
  const previousMonth = getPreviousMonthKey(currentMonth);

  const stats = React.useMemo(() => {
    const currentExpenses = expenses.filter((expense) => expense.date.slice(0, 7) === currentMonth);
    const previousExpenses = expenses.filter((expense) => expense.date.slice(0, 7) === previousMonth);
    const currentTotal = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousTotal = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals: Record<string, number> = {};

    currentExpenses.forEach((expense) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    return {
      currentTotal: Math.round(currentTotal * 100) / 100,
      previousTotal: Math.round(previousTotal * 100) / 100,
      currentCount: currentExpenses.length,
      topCategories: Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    };
  }, [expenses, currentMonth, previousMonth]);

  const change = stats.previousTotal === 0
    ? (stats.currentTotal === 0 ? 0 : null)
    : ((stats.currentTotal - stats.previousTotal) / stats.previousTotal) * 100;
  const isDecrease = change !== null && change < 0;

  const openCurrentMonth = () => {
    onNavigateToExpenseMonth?.(currentMonth);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCurrentMonth();
    }
  };

  if (stats.currentTotal === 0 && stats.previousTotal === 0) {
    return <div className="widget-empty-state"><span>📊</span><p>{t('noComparisonData')}</p></div>;
  }

  return (
    <div
      className={`month-comparison-widget ${onNavigateToExpenseMonth ? 'clickable' : ''}`}
      onClick={onNavigateToExpenseMonth ? openCurrentMonth : undefined}
      onKeyDown={onNavigateToExpenseMonth ? handleKeyDown : undefined}
      role={onNavigateToExpenseMonth ? 'button' : undefined}
      tabIndex={onNavigateToExpenseMonth ? 0 : undefined}
      title={onNavigateToExpenseMonth ? '查看本月支出' : undefined}
    >
      <div className="comparison-row">
        <div className="comparison-label">{t('thisMonth')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>${stats.currentTotal.toFixed(2)}</span>
          {change === null ? (
            <span className="warning-text">{t('new')}</span>
          ) : (
            <span className={isDecrease ? 'success-text' : change > 0 ? 'error-text' : ''}>
              {change === 0 ? '→ 0.0%' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`}
            </span>
          )}
        </div>
      </div>

      <div className="comparison-row">
        <div className="comparison-label">{t('lastMonth')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>${stats.previousTotal.toFixed(2)}</span>
          <span>{stats.currentCount} {t('transactions')}</span>
        </div>
      </div>

      {stats.topCategories.length > 0 && (
        <div className="comparison-row month-top-categories">
          <div className="comparison-label">{t('topCategories')}</div>
          <div className="month-category-list">
            {stats.topCategories.map(([category, amount]) => (
              <span key={category}>{category}: ${amount.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthOverMonthWidget;
