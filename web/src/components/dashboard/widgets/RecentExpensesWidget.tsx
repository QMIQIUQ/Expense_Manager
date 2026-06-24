import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';
import { WidgetProps } from './types';

interface RecentExpensesWidgetProps extends WidgetProps {
  onViewAll?: () => void;
  onNavigateToExpense?: (expenseId: string) => void;
}

const RecentExpensesWidget: React.FC<RecentExpensesWidgetProps> = ({ expenses, size = 'medium', displayCurrency, onViewAll, onNavigateToExpense }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  
  // Determine how many expenses to show based on size
  const maxItems = React.useMemo(() => {
    switch (size) {
      case 'small':
        return 3;
      case 'large':
      case 'full':
        return 10;
      default:
        return 5;
    }
  }, [size]);

  // Get recent expenses sorted by date
  const recentExpenses = React.useMemo(
    () =>
      [...expenses]
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        })
        .slice(0, maxItems),
    [expenses, maxItems]
  );
  
  const hasMore = expenses.length > maxItems;
  const expenseDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return recentExpenses
      .filter((expense) => !!expense.id)
      .map((expense) => ({
        key: expense.id as string,
        amount: getExpenseBaseAmount(expense),
        sourceCurrency: getExpenseBaseCurrency(expense),
        date: expense.date,
      }));
  }, [displayCurrency, recentExpenses]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);

  if (recentExpenses.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>💳</span>
        <p>{t('noExpenses')}</p>
      </div>
    );
  }

  const isCompact = size === 'small';

  return (
    <div className={`recent-expenses-list ${isCompact ? 'recent-expenses-compact' : ''}`}>
      {recentExpenses.map((expense) => (
        <div 
          key={expense.id} 
          className={`recent-expense-item ${onNavigateToExpense ? 'clickable' : ''}`}
          onClick={() => onNavigateToExpense?.(expense.id!)}
          role={onNavigateToExpense ? 'button' : undefined}
          tabIndex={onNavigateToExpense ? 0 : undefined}
        >
          <div className="recent-expense-info">
            <span className="recent-expense-category">{expense.category}</span>
            <span className="recent-expense-desc">{expense.description}</span>
          </div>
          <div className="recent-expense-right">
            <span className="recent-expense-amount error-text">
              {formatMoney(
                displayCurrency
                  ? (expenseDisplayAmountsById[expense.id || ''] ?? getExpenseBaseAmount(expense))
                  : getExpenseBaseAmount(expense),
                displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY
              )}
            </span>
            <span className="recent-expense-date">
              {formatDateWithUserFormat(expense.date, dateFormat)}
            </span>
          </div>
        </div>
      ))}
      
      {hasMore && onViewAll && (
        <button 
          className="more-cards-button"
          onClick={onViewAll}
          type="button"
        >
          {t('viewAll')} →
        </button>
      )}
    </div>
  );
};

export default RecentExpensesWidget;
