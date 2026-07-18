import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseDisplaySource } from '../../../utils/currencyUtils';
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
  displayCurrency,
  onNavigateToExpenseMonth,
}) => {
  const { t } = useLanguage();
  const isCompact = size === 'small';
  const currentMonth = getTodayLocal().slice(0, 7);
  const previousMonth = getPreviousMonthKey(currentMonth);
  const targetCurrency = displayCurrency || DEFAULT_BASE_CURRENCY;

  const conversionEntries = React.useMemo(() => (
    expenses
      .map((expense, index) => ({ expense, index }))
      .filter(({ expense }) => {
        const month = expense.date.slice(0, 7);
        return month === currentMonth || month === previousMonth;
      })
      .map(({ expense, index }) => {
        const displaySource = getExpenseDisplaySource(expense, targetCurrency);
        return {
          key: expense.id || `${expense.date}-${index}`,
          amount: displaySource.amount,
          sourceCurrency: displaySource.sourceCurrency,
          date: expense.date,
        };
      })
  ), [currentMonth, expenses, previousMonth, targetCurrency]);

  const convertedAmounts = useCurrencyConversionMap(conversionEntries, targetCurrency);

  const stats = React.useMemo(() => {
    const indexedExpenses = expenses.map((expense, index) => ({ expense, index }));
    const currentExpenses = indexedExpenses.filter(({ expense }) => expense.date.slice(0, 7) === currentMonth);
    const previousExpenses = indexedExpenses.filter(({ expense }) => expense.date.slice(0, 7) === previousMonth);
    const getDisplayAmount = (expense: typeof expenses[number], index: number) => {
      const key = expense.id || `${expense.date}-${index}`;
      return convertedAmounts[key] ?? getExpenseDisplaySource(expense, targetCurrency).amount;
    };
    const currentTotal = currentExpenses.reduce((sum, { expense, index }) => sum + getDisplayAmount(expense, index), 0);
    const previousTotal = previousExpenses.reduce((sum, { expense, index }) => sum + getDisplayAmount(expense, index), 0);
    const categoryTotals: Record<string, number> = {};

    currentExpenses.forEach(({ expense, index }) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + getDisplayAmount(expense, index);
    });

    return {
      currentTotal: Math.round(currentTotal * 100) / 100,
      previousTotal: Math.round(previousTotal * 100) / 100,
      previousCount: previousExpenses.length,
      topCategories: Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    };
  }, [convertedAmounts, currentMonth, expenses, previousMonth, targetCurrency]);

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
      title={onNavigateToExpenseMonth ? `${t('thisMonth')} ${t('expenses')}` : undefined}
    >
      <div className="comparison-row">
        <div className="comparison-label">{t('thisMonth')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>{formatMoney(stats.currentTotal, targetCurrency)}</span>
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
          <span className={isCompact ? 'compact-value' : ''}>{formatMoney(stats.previousTotal, targetCurrency)}</span>
          <span>{stats.previousCount} {t('transactions')}</span>
        </div>
      </div>

      {stats.topCategories.length > 0 && (
        <div className="comparison-row month-top-categories">
          <div className="comparison-label">{t('topCategories')}</div>
          <div className="month-category-list">
            {stats.topCategories.map(([category, amount]) => (
              <span key={category}>{category}: {formatMoney(amount, targetCurrency)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthOverMonthWidget;
