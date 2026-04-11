import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { getBillingCycleRange } from './utils';

const MonthOverMonthWidget: React.FC<WidgetProps> = ({
  expenses,
  incomes,
  repayments,
  billingCycleDay = 1,
  size = 'medium',
}) => {
  const { t } = useLanguage();
  const isCompact = size === 'small';

  const { currentCycle, previousCycle } = React.useMemo(() => {
    const { cycleStart, cycleEnd } = getBillingCycleRange(billingCycleDay);
    const prevCycleStartDate = new Date(cycleStart);
    prevCycleStartDate.setMonth(prevCycleStartDate.getMonth() - 1);
    const prevCycleEndDate = new Date(cycleStart);
    prevCycleEndDate.setDate(prevCycleEndDate.getDate() - 1);
    return {
      currentCycle: { start: cycleStart, end: cycleEnd },
      previousCycle: { start: prevCycleStartDate, end: prevCycleEndDate },
    };
  }, [billingCycleDay]);

  const stats = React.useMemo(() => {
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) repaymentsByExpense[rep.expenseId] = (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
    });

    const getNetAmount = (exp: { id?: string; amount: number }) => {
      const repaid = repaymentsByExpense[exp.id || ''] || 0;
      return Math.max(0, exp.amount - repaid);
    };

    const filterExpenses = (start: Date, end: Date) =>
      expenses.filter((exp) => new Date(exp.date) >= start && new Date(exp.date) <= end)
        .reduce((sum, exp) => sum + getNetAmount(exp), 0);

    const filterIncomes = (start: Date, end: Date) =>
      incomes.filter((inc) => new Date(inc.date) >= start && new Date(inc.date) <= end)
        .reduce((sum, inc) => sum + inc.amount, 0);

    const currentExpenses = filterExpenses(currentCycle.start, currentCycle.end);
    const currentIncomes = filterIncomes(currentCycle.start, currentCycle.end);
    const previousExpenses = filterExpenses(previousCycle.start, previousCycle.end);
    const previousIncomes = filterIncomes(previousCycle.start, previousCycle.end);

    const currentSavings = currentIncomes - currentExpenses;
    const previousSavings = previousIncomes - previousExpenses;

    return {
      currentExpenses: Math.round(currentExpenses * 100) / 100,
      previousExpenses: Math.round(previousExpenses * 100) / 100,
      currentIncomes: Math.round(currentIncomes * 100) / 100,
      previousIncomes: Math.round(previousIncomes * 100) / 100,
      currentSavings: Math.round(currentSavings * 100) / 100,
      previousSavings: Math.round(previousSavings * 100) / 100,
    };
  }, [expenses, incomes, repayments, currentCycle, previousCycle]);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return 0;
      return null; // Undefined change when growing from zero
    }
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  const expenseChange = calculateChange(stats.currentExpenses, stats.previousExpenses);
  const incomeChange = calculateChange(stats.currentIncomes, stats.previousIncomes);
  const savingsChange = calculateChange(stats.currentSavings, stats.previousSavings);

  const renderChange = (change: number | null, isExpense: boolean = false) => {
    if (change === null) {
      return <span className="warning-text">{t('new')}</span>;
    }
    if (change === 0) {
      return <span>→ 0.0%</span>;
    }
    const isGood = isExpense ? change < 0 : change > 0;
    const arrow = change > 0 ? '↑' : '↓';
    return (
      <span className={isGood ? 'success-text' : 'error-text'}>
        {arrow} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  if (stats.currentExpenses === 0 && stats.previousExpenses === 0 && 
      stats.currentIncomes === 0 && stats.previousIncomes === 0) {
    return <div className="widget-empty-state"><span>📊</span><p>{t('noComparisonData')}</p></div>;
  }

  return (
    <div className="month-comparison-widget">
      <div className="comparison-row">
        <div className="comparison-label">{t('expenses')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>
            ${stats.currentExpenses.toFixed(2)} {t('vs')} ${stats.previousExpenses.toFixed(2)}
          </span>
          {renderChange(expenseChange, true)}
        </div>
      </div>

      <div className="comparison-row">
        <div className="comparison-label">{t('incomes')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>
            ${stats.currentIncomes.toFixed(2)} {t('vs')} ${stats.previousIncomes.toFixed(2)}
          </span>
          {renderChange(incomeChange)}
        </div>
      </div>

      <div className="comparison-row">
        <div className="comparison-label">{t('savings')}</div>
        <div className="comparison-values">
          <span className={isCompact ? 'compact-value' : ''}>
            ${stats.currentSavings.toFixed(2)} {t('vs')} ${stats.previousSavings.toFixed(2)}
          </span>
          {renderChange(savingsChange)}
        </div>
      </div>
    </div>
  );
};

export default MonthOverMonthWidget;
