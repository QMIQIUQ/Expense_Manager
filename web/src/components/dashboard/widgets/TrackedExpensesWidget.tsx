import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const TrackedExpensesWidget: React.FC<WidgetProps> = ({
  expenses,
  repayments,
  onMarkTrackingCompleted,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  
  // Determine display settings based on size
  const isCompact = size === 'small';
  const maxItems = React.useMemo(() => {
    switch (size) {
      case 'small':
        return 2;
      case 'large':
        return 6;
      default:
        return 4;
    }
  }, [size]);

  // Get tracked expenses and repayment totals
  const { trackedExpenses, repaymentTotals } = React.useMemo(() => {
    const tracked = expenses.filter(
      (exp) => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
    );

    const totals: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) {
        totals[rep.expenseId] = (totals[rep.expenseId] || 0) + rep.amount;
      }
    });

    return { trackedExpenses: tracked, repaymentTotals: totals };
  }, [expenses, repayments]);

  if (trackedExpenses.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>✅</span>
        <p>{t('noTrackedExpenses')}</p>
      </div>
    );
  }

  return (
    <div className={`tracked-expenses-list ${isCompact ? 'tracked-expenses-compact' : ''}`}>
      {trackedExpenses.slice(0, maxItems).map((expense) => {
        const repaid = repaymentTotals[expense.id!] || 0;
        const remaining = expense.amount - repaid;
        const percentage = (repaid / expense.amount) * 100;

        return (
          <div key={expense.id} className="tracked-expense-card">
            <div className="tracked-expense-header">
              <div className="tracked-expense-info">
                <span className="tracked-expense-title">{expense.description}</span>
                <span className="tracked-expense-date">{expense.date}</span>
              </div>
              {onMarkTrackingCompleted && (
                <button
                  onClick={() => onMarkTrackingCompleted(expense.id!)}
                  className="btn-complete"
                  title={t('markAsCompleted')}
                >
                  ✓
                </button>
              )}
            </div>
            <div className="tracked-expense-amounts">
              <div className="tracked-amount-item">
                <span className="tracked-amount-label">{t('totalAmount')}:</span>
                <span className="tracked-amount-value">${expense.amount.toFixed(2)}</span>
              </div>
              <div className="tracked-amount-item">
                <span className="tracked-amount-label">{t('repaid')}:</span>
                <span className="tracked-amount-value success-text">${repaid.toFixed(2)}</span>
              </div>
              <div className="tracked-amount-item">
                <span className="tracked-amount-label">{t('remaining')}:</span>
                <span className="tracked-amount-value warning-text">${remaining.toFixed(2)}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill success-bg" style={{ width: `${percentage}%` }} />
            </div>
            <span className="category-percentage">
              {percentage.toFixed(0)}% {t('collected')}
            </span>
          </div>
        );
      })}
      {trackedExpenses.length > maxItems && (
        <div className="tracked-more-text">
          +{trackedExpenses.length - maxItems} {t('more')}
        </div>
      )}
    </div>
  );
};

export default TrackedExpensesWidget;
