import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

interface RecentExpensesWidgetProps extends WidgetProps {
  onViewAll?: () => void;
}

const RecentExpensesWidget: React.FC<RecentExpensesWidgetProps> = ({ expenses, size = 'medium', onViewAll }) => {
  const { t } = useLanguage();
  
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
        <div key={expense.id} className="recent-expense-item">
          <div className="recent-expense-info">
            <span className="recent-expense-category">{expense.category}</span>
            <span className="recent-expense-desc">{expense.description}</span>
          </div>
          <div className="recent-expense-right">
            <span className="recent-expense-amount error-text">
              ${expense.amount.toFixed(2)}
            </span>
            <span className="recent-expense-date">
              {new Date(expense.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
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
