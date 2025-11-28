import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import { getTodayLocal } from '../../../utils/dateUtils';

const SummaryCardsWidget: React.FC<WidgetProps> = ({
  expenses,
  incomes,
  repayments,
  billingCycleDay = 1,
  size = 'full',
}) => {
  const { t } = useLanguage();
  
  // Determine layout based on size
  const isCompact = size === 'small' || size === 'medium';

  // Calculate billing cycle dates
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

  // Calculate statistics
  const stats = React.useMemo(() => {
    const monthly = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= cycleStart && expDate <= cycleEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const monthlyIncome = incomes
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate >= cycleStart && incDate <= cycleEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const today = getTodayLocal();
    const daily = expenses
      .filter((exp) => exp.date === today)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Total unrecovered from tracked expenses
    const repaymentsByExpense: { [expenseId: string]: number } = {};
    repayments.forEach((rep) => {
      if (rep.expenseId) {
        repaymentsByExpense[rep.expenseId] =
          (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
      }
    });

    const totalUnrecovered = expenses
      .filter(exp => exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted)
      .reduce((sum, exp) => {
        const repaid = repaymentsByExpense[exp.id || ''] || 0;
        const remaining = Math.max(0, exp.amount - repaid);
        return sum + remaining;
      }, 0);

    const netCashflow = monthlyIncome - monthly;

    const trackedCount = expenses.filter(exp =>
      exp.needsRepaymentTracking && !exp.repaymentTrackingCompleted
    ).length;

    return {
      monthly,
      monthlyIncome,
      daily,
      totalUnrecovered,
      netCashflow,
      trackedCount,
    };
  }, [expenses, incomes, repayments, cycleStart, cycleEnd]);

  return (
    <div className={`summary-cards-grid ${isCompact ? 'summary-cards-compact' : ''}`}>
      <div className="summary-card">
        <div className="card-icon error-bg">💰</div>
        <div className="card-content">
          <div className="card-label">{t('monthlyExpense')}</div>
          <div className="card-value error-text">${stats.monthly.toFixed(2)}</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon success-bg">💵</div>
        <div className="card-content">
          <div className="card-label">{t('monthlyIncome')}</div>
          <div className="card-value success-text">${stats.monthlyIncome.toFixed(2)}</div>
        </div>
      </div>

      <div className="summary-card">
        <div className={`card-icon ${stats.netCashflow >= 0 ? 'success-bg' : 'error-bg'}`}>
          {stats.netCashflow >= 0 ? '📈' : '📉'}
        </div>
        <div className="card-content">
          <div className="card-label">{t('netCashflow')}</div>
          <div className={`card-value ${stats.netCashflow >= 0 ? 'success-text' : 'error-text'}`}>
            ${stats.netCashflow.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="summary-card" style={{ position: 'relative' }}>
        <div className="card-icon warning-bg">💸</div>
        <div className="card-content">
          <div className="card-label">{t('unrecovered')}</div>
          <div className="card-value warning-text">${stats.totalUnrecovered.toFixed(2)}</div>
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
