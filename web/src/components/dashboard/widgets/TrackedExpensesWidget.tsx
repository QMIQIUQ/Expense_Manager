import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../../utils/dateUtils';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';
import { WidgetProps } from './types';

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

  const expenseById = React.useMemo(() => new Map(expenses.map((expense) => [expense.id || '', expense])), [expenses]);

  const expenseDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return trackedExpenses
      .filter((expense) => !!expense.id)
      .map((expense) => ({
        key: expense.id as string,
        amount: getExpenseBaseAmount(expense),
        sourceCurrency: getExpenseBaseCurrency(expense),
        date: expense.date,
      }));
  }, [displayCurrency, trackedExpenses]);

  const repaymentDisplayEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return repayments
      .filter((repayment) => !!repayment.id)
      .map((repayment) => {
        const linkedExpense = expenseById.get(repayment.expenseId || '');
        return {
          key: repayment.id as string,
          amount: repayment.amount,
          sourceCurrency: linkedExpense ? getExpenseBaseCurrency(linkedExpense) : DEFAULT_BASE_CURRENCY,
          date: linkedExpense?.date || repayment.date,
        };
      });
  }, [displayCurrency, expenseById, repayments]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseDisplayEntries, displayCurrency);
  const repaymentDisplayAmountsById = useCurrencyConversionMap(repaymentDisplayEntries, displayCurrency);

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
        const totalAmount = displayCurrency
          ? (expenseDisplayAmountsById[expense.id || ''] ?? getExpenseBaseAmount(expense))
          : getExpenseBaseAmount(expense);
        const repaidDisplay = displayCurrency
          ? repayments
              .filter((repayment) => repayment.expenseId === expense.id)
              .reduce((sum, repayment) => sum + (repaymentDisplayAmountsById[repayment.id || ''] ?? repayment.amount), 0)
          : repaid;
        const remaining = totalAmount - repaidDisplay;
        const percentage = totalAmount > 0 ? (repaidDisplay / totalAmount) * 100 : 0;

        return (
          <div 
            key={expense.id} 
            className={`tracked-expense-card ${onNavigateToExpense ? 'clickable' : ''}`}
            onClick={() => onNavigateToExpense?.(expense.id!)}
            role={onNavigateToExpense ? 'button' : undefined}
            tabIndex={onNavigateToExpense ? 0 : undefined}
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
              {onMarkTrackingCompleted && (
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
