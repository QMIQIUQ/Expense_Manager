import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseDisplaySource } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';
import { WidgetProps } from './types';
import { isOpenReceivable, receivableProgress } from '../../../utils/expenseSplitCalculator';

const TrackedExpensesWidget: React.FC<WidgetProps> = ({
  expenses,
  repayments,
  onMarkTrackingCompleted,
  onNavigateToExpense,
  size = 'medium',
  displayCurrency,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  
  // Determine display settings based on size
  const isCompact = size === 'small';
  const maxItems = React.useMemo(() => {
    switch (size) {
      case 'small':
        return 2;
      case 'large':
      case 'full':
        return 6;
      default:
        return 3;
    }
  }, [size]);

  const trackedExpenses = React.useMemo(() => expenses.filter((expense) => isOpenReceivable(expense, repayments)), [expenses, repayments]);

  const expenseDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return trackedExpenses
      .filter((expense) => !!expense.id)
      .map((expense) => {
        const displaySource = getExpenseDisplaySource(expense, displayCurrency);
        return {
          key: expense.id as string,
          amount: displaySource.amount,
          sourceCurrency: displaySource.sourceCurrency,
          date: expense.date,
        };
      });
  }, [displayCurrency, trackedExpenses]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);

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
        const displaySource = getExpenseDisplaySource(expense, displayCurrency);
        const fullAmount = displayCurrency
          ? (displaySource.sourceCurrency === displayCurrency
            ? displaySource.amount
            : expenseDisplayAmountsById[expense.id || ''] ?? Number.NaN)
          : getExpenseBaseAmount(expense);
        const progress = receivableProgress(expense, repayments);
        const totalAmount = fullAmount * progress.expectedRatio;
        const remaining = fullAmount * progress.outstandingRatio;
        const repaidDisplay = Math.max(0, totalAmount - remaining);
        const percentage = progress.percent;

        return (
          <div 
            key={expense.id} 
            className={`tracked-expense-card ${onNavigateToExpense && expense.id ? 'clickable' : ''}`}
            onClick={() => { if (expense.id) onNavigateToExpense?.(expense.id); }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || !onNavigateToExpense || !expense.id || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              onNavigateToExpense(expense.id);
            }}
            role={onNavigateToExpense && expense.id ? 'button' : undefined}
            tabIndex={onNavigateToExpense && expense.id ? 0 : undefined}
          >
            <div className="tracked-expense-header">
              <div className="tracked-expense-info">
                <span className="tracked-expense-title">
                  {expense.description}
                </span>
                <span className="tracked-expense-date">{formatDateWithUserFormat(expense.date, dateFormat)} · {percentage.toFixed(0)}%</span>
              </div>
              <div className="tracked-expense-amounts">
                <div className="tracked-amount-item">
                  <span className="tracked-amount-label">{t('totalAmount')}</span>
                  <span className="tracked-amount-value">{formatMoney(totalAmount, displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY)}</span>
                </div>
                <div className="tracked-amount-item">
                  <span className="tracked-amount-label">{t('repaid')}</span>
                  <span className="tracked-amount-value success-text">{formatMoney(repaidDisplay, displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY)}</span>
                </div>
                <div className="tracked-amount-item">
                  <span className="tracked-amount-label">{t('remaining')}</span>
                  <span className="tracked-amount-value warning-text">{formatMoney(Math.max(0, remaining), displayCurrency || expense.baseCurrency || expense.currency || DEFAULT_BASE_CURRENCY)}</span>
                </div>
              </div>
              {onMarkTrackingCompleted && !expense.splitParticipants?.length && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkTrackingCompleted(expense.id!);
                  }}
                  className="btn-complete"
                  title={t('markAsCompleted')}
                  aria-label={t('markAsCompleted')}
                >
                  ✓
                </button>
              )}
            </div>
            <div className="progress-bar">
              <div className="progress-fill success-bg" style={{ width: `${percentage}%` }} />
            </div>
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
