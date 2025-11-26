import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const RecentExpensesWidget: React.FC<WidgetProps> = ({ expenses }) => {
  const { t } = useLanguage();

  // Get recent 5 expenses
  const recentExpenses = React.useMemo(
    () =>
      [...expenses]
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        })
        .slice(0, 5),
    [expenses]
  );

  if (recentExpenses.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>💳</span>
        <p>{t('noExpenses')}</p>
      </div>
    );
  }

  return (
    <div className="recent-expenses-list">
      {recentExpenses.map((expense) => (
        <div key={expense.id} className="recent-expense-item">
          <div className="recent-expense-info">
            <span className="recent-expense-desc">{expense.description}</span>
            <span className="recent-expense-category">{expense.category}</span>
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
    </div>
  );
};

export default RecentExpensesWidget;
