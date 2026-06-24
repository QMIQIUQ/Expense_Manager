import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Expense } from '../../../types';
import { WidgetProps } from './types';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseBaseAmount, getExpenseBaseCurrency, getExpenseDisplaySource } from '../../../utils/currencyUtils';
import { useCurrencyConversionMap } from '../../../hooks/useCurrencyConversionMap';

const SummaryCardsWidget: React.FC<WidgetProps> = ({
  expenses,
  incomes,
  repayments,
  billingCycleDay = 1,
  size = 'full',
  displayCurrency,
  onNavigateToExpenses,
  onNavigateToIncomes,
}) => {
  const { t } = useLanguage();

  const handleKeyDown = (callback?: () => void) => (e: React.KeyboardEvent) => {
    if (callback && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      callback();
    }
  };

  const isCompact = size === 'small' || size === 'medium';

  const { cycleStart, cycleEnd } = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();

    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }

    return { cycleStart, cycleEnd };
  }, [billingCycleDay]);

  const expenseById = React.useMemo(() => new Map(expenses.map((expense) => [expense.id || '', expense])), [expenses]);

  const expenseConversionEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return expenses
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
  }, [displayCurrency, expenses]);

  const repaymentConversionEntries = React.useMemo(() => {
    if (!displayCurrency) return [];
    return repayments
      .filter((repayment) => !!repayment.id)
      .map((repayment) => {
        const linkedExpense = expenseById.get(repayment.expenseId || '');
        return {
          key: repayment.id as string,
          amount: repayment.amount,
          sourceCurrency: linkedExpense ? getExpenseBaseCurrency(linkedExpense) : DEFAULT_BASE_CURRENCY,
          date: repayment.date,
        };
      });
  }, [displayCurrency, expenseById, repayments]);

  const expenseDisplayAmountsById = useCurrencyConversionMap(expenseConversionEntries, displayCurrency);
  const repaymentDisplayAmountsById = useCurrencyConversionMap(repaymentConversionEntries, displayCurrency);

  const stats = React.useMemo(() => {
    const repaymentsByExpenseBase: { [expenseId: string]: number } = {};
    const repaymentsByExpenseDisplay: { [expenseId: string]: number } = {};

    repayments.forEach((rep) => {
      if (!rep.expenseId) return;
      repaymentsByExpenseBase[rep.expenseId] = (repaymentsByExpenseBase[rep.expenseId] || 0) + rep.amount;
      repaymentsByExpenseDisplay[rep.expenseId] = (repaymentsByExpenseDisplay[rep.expenseId] || 0) + (
        displayCurrency ? (repaymentDisplayAmountsById[rep.id || ''] ?? rep.amount) : rep.amount
      );
    });

    const getMonthlyBaseAmount = (exp: Expense) => {
      const repaid = repaymentsByExpenseBase[exp.id || ''] || 0;
      return Math.max(0, getExpenseBaseAmount(exp) - repaid);
    };

    const getMonthlyDisplayAmount = (exp: Expense) => {
      const displaySource = getExpenseDisplaySource(exp, displayCurrency);
      const expenseAmount = displayCurrency
        ? (displaySource.sourceCurrency === displayCurrency
          ? displaySource.amount
          : expenseDisplayAmountsById[exp.id || ''] ?? displaySource.amount)
        : getExpenseBaseAmount(exp);
      const repaid = repaymentsByExpenseDisplay[exp.id || ''] || 0;
      return Math.max(0, expenseAmount - repaid);
    };

    const monthlyBase = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + getMonthlyBaseAmount(exp), 0);

    const monthlyDisplay = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + getMonthlyDisplayAmount(exp), 0);

    const monthlyIncome = incomes
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate >= cycleStart && incDate <= cycleEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const totalUnrecoveredBase = expenses
      .filter((exp) => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = repaymentsByExpenseBase[exp.id || ''] || 0;
        return sum + Math.max(0, getExpenseBaseAmount(exp) - repaid);
      }, 0);

    const totalUnrecoveredDisplay = expenses
      .filter((exp) => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = repaymentsByExpenseDisplay[exp.id || ''] || 0;
        const displaySource = getExpenseDisplaySource(exp, displayCurrency);
        const amount = displayCurrency
          ? (displaySource.sourceCurrency === displayCurrency
            ? displaySource.amount
            : expenseDisplayAmountsById[exp.id || ''] ?? displaySource.amount)
          : getExpenseBaseAmount(exp);
        return sum + Math.max(0, amount - repaid);
      }, 0);

    const netCashflow = monthlyIncome - monthlyBase;

    const trackedCount = expenses.filter((exp) =>
      exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
    ).length;

    return {
      monthlyBase,
      monthlyDisplay,
      monthlyIncome,
      totalUnrecoveredBase,
      totalUnrecoveredDisplay,
      netCashflow,
      trackedCount,
    };
  }, [cycleEnd, cycleStart, displayCurrency, expenseDisplayAmountsById, incomes, repaymentDisplayAmountsById, repayments, expenses]);

  const expenseCurrency = displayCurrency || DEFAULT_BASE_CURRENCY;

  return (
    <div className={`summary-cards-grid ${isCompact ? 'summary-cards-compact' : ''}`}>
      <div
        className={`summary-card ${onNavigateToExpenses ? 'clickable' : ''}`}
        onClick={onNavigateToExpenses}
        onKeyDown={handleKeyDown(onNavigateToExpenses)}
        role={onNavigateToExpenses ? 'button' : undefined}
        tabIndex={onNavigateToExpenses ? 0 : undefined}
      >
        <div className="card-icon error-bg">💰</div>
        <div className="card-content">
          <div className="card-label">{t('monthlyExpense')}</div>
          <div className="card-value error-text">{formatMoney(stats.monthlyDisplay, expenseCurrency)}</div>
        </div>
      </div>

      <div
        className={`summary-card ${onNavigateToIncomes ? 'clickable' : ''}`}
        onClick={onNavigateToIncomes}
        onKeyDown={handleKeyDown(onNavigateToIncomes)}
        role={onNavigateToIncomes ? 'button' : undefined}
        tabIndex={onNavigateToIncomes ? 0 : undefined}
      >
        <div className="card-icon success-bg">💵</div>
        <div className="card-content">
          <div className="card-label">{t('monthlyIncome')}</div>
          <div className="card-value success-text">{formatMoney(stats.monthlyIncome, DEFAULT_BASE_CURRENCY)}</div>
        </div>
      </div>

      <div className="summary-card">
        <div className={`card-icon ${stats.netCashflow >= 0 ? 'success-bg' : 'error-bg'}`}>
          {stats.netCashflow >= 0 ? '📈' : '📉'}
        </div>
        <div className="card-content">
          <div className="card-label">{t('netCashflow')}</div>
          <div className={`card-value ${stats.netCashflow >= 0 ? 'success-text' : 'error-text'}`}>
            {formatMoney(stats.netCashflow, DEFAULT_BASE_CURRENCY)}
          </div>
        </div>
      </div>

      <div
        className={`summary-card ${onNavigateToExpenses ? 'clickable' : ''}`}
        onClick={onNavigateToExpenses}
        onKeyDown={handleKeyDown(onNavigateToExpenses)}
        role={onNavigateToExpenses ? 'button' : undefined}
        tabIndex={onNavigateToExpenses ? 0 : undefined}
        style={{ position: 'relative' }}
      >
        <div className="card-icon warning-bg">💸</div>
        <div className="card-content">
          <div className="card-label">{t('unrecovered')}</div>
          <div className="card-value warning-text">{formatMoney(stats.totalUnrecoveredDisplay, expenseCurrency)}</div>
        </div>
        {stats.trackedCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'var(--warning-text)',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {stats.trackedCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCardsWidget;
