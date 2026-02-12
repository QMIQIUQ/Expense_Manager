import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { getBillingCycleRange } from './utils';

const SavingsGoalWidget: React.FC<WidgetProps> = ({
  expenses,
  incomes,
  repayments,
  billingCycleDay = 1,
  size = 'medium',
}) => {
  const { t } = useLanguage();

  // Determine layout based on size
  const isCompact = size === 'small';

  // Calculate billing cycle dates
  const { cycleStart, cycleEnd } = React.useMemo(
    () => getBillingCycleRange(billingCycleDay),
    [billingCycleDay]
  );

  // Calculate savings statistics
  const savingsStats = React.useMemo(() => {
    // Build repayment totals first (needed for net expense calculations)
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) {
        repaymentsByExpense[rep.expenseId] =
          (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
      }
    });

    // Helper to get net expense amount (expense - repayments, min 0)
    const getNetAmount = (exp: { id?: string; amount: number }) => {
      const repaid = repaymentsByExpense[exp.id || ''] || 0;
      return Math.max(0, exp.amount - repaid);
    };

    // Total income for this billing cycle
    const totalIncome = incomes
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate >= cycleStart && incDate <= cycleEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    // Total net expenses for this billing cycle (after repayments)
    const totalExpenses = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + getNetAmount(exp), 0);

    // Calculate savings
    const totalSaved = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

    // Calculate daily average savings
    const now = new Date();
    const daysInCycle = Math.ceil((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = daysInCycle > 0 ? totalSaved / daysInCycle : 0;

    return {
      totalSaved: Math.round(totalSaved * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      totalIncome,
      hasData: totalIncome > 0 || totalExpenses > 0,
    };
  }, [expenses, incomes, repayments, cycleStart, cycleEnd]);

  // Empty state
  if (!savingsStats.hasData) {
    return (
      <div className="widget-empty-state">
        <span>💰</span>
        <p>{t('noSavingsData')}</p>
      </div>
    );
  }

  return (
    <div className={`savings-goal-widget ${isCompact ? 'compact' : ''}`}>
      <div className="savings-goal-card">
        <div className="card-header">
          <span className="card-icon">💰</span>
          <h3>{t('savings')}</h3>
        </div>
        <div className="card-body">
          <div className="savings-amount">
            <span className={savingsStats.totalSaved >= 0 ? 'success-text' : 'error-text'}>
              ${Math.abs(savingsStats.totalSaved).toFixed(2)}
            </span>
          </div>
          <div className="savings-rate">
            <div className="savings-rate-label">
              <span>{t('savingsRate')}</span>
              <span className={savingsStats.savingsRate >= 0 ? 'success-text' : 'error-text'}>
                {savingsStats.savingsRate.toFixed(1)}%
              </span>
            </div>
            <div className="savings-rate-bar">
              <div
                className="savings-rate-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, savingsStats.savingsRate))}%`,
                  backgroundColor: 'var(--accent-primary)',
                }}
              />
            </div>
          </div>
          <div className="daily-average">
            <span className="label">{t('dailyAverage')}:</span>
            <span className={savingsStats.dailyAverage >= 0 ? 'success-text' : 'error-text'}>
              ${Math.abs(savingsStats.dailyAverage).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalWidget;
