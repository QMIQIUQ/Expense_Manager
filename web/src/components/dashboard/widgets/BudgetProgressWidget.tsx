import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const BudgetProgressWidget: React.FC<WidgetProps> = ({ budgets, expenses, billingCycleDay = 1 }) => {
  const { t } = useLanguage();

  // Calculate billing cycle
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

  // Calculate budget progress
  const budgetProgress = React.useMemo(() => {
    return budgets.map((budget) => {
      const spent = expenses
        .filter((exp) => {
          const expDate = new Date(exp.date);
          const matchesCategory = exp.category === budget.categoryName;
          const inCycle = expDate >= cycleStart && expDate <= cycleEnd;
          return matchesCategory && inCycle;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const remaining = Math.max(0, budget.amount - spent);
      const isOverBudget = spent > budget.amount;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isOverBudget,
      };
    });
  }, [budgets, expenses, cycleStart, cycleEnd]);

  if (budgetProgress.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>🎯</span>
        <p>{t('noBudgets')}</p>
      </div>
    );
  }

  return (
    <div className="budget-progress-list">
      {budgetProgress.map((budget) => (
        <div key={budget.id} className="budget-progress-item">
          <div className="budget-info">
            <span className="budget-category">{budget.categoryName}</span>
            <span className={`budget-amount ${budget.isOverBudget ? 'error-text' : ''}`}>
              ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${budget.isOverBudget ? 'error-bg' : budget.percentage > 80 ? 'warning-bg' : 'success-bg'}`}
              style={{ width: `${Math.min(100, budget.percentage)}%` }}
            />
          </div>
          <div className="budget-status">
            <span className="budget-percentage">{budget.percentage.toFixed(1)}%</span>
            {budget.isOverBudget ? (
              <span className="error-text">{t('overBudget')}</span>
            ) : (
              <span className="success-text">${budget.remaining.toFixed(2)} {t('remaining')}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BudgetProgressWidget;
