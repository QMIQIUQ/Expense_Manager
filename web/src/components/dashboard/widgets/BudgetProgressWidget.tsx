import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';

const BudgetProgressWidget: React.FC<WidgetProps> = ({ budgets, expenses, billingCycleDay = 1, size = 'medium' }) => {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  
  // Determine max items based on size
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

  // Get progress color based on percentage (same as BudgetManager)
  const getProgressColor = (percentage: number, threshold: number = 80) => {
    if (percentage >= 100) return '#dc2626'; // Red - over budget
    if (percentage >= 90) return '#ea580c'; // Orange-red
    if (percentage >= threshold) return '#f59e0b'; // Orange - warning
    if (percentage >= 60) return '#fbbf24'; // Yellow
    if (percentage >= 40) return '#a3e635'; // Light green
    return '#22c55e'; // Green - safe
  };

  // Get period label
  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: t('periodDaily'),
      weekly: t('periodWeekly'),
      monthly: t('periodMonthly'),
      yearly: t('periodYearly'),
    };
    return labels[period] || period;
  };

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
      const progressColor = getProgressColor(percentage, budget.alertThreshold || 80);

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isOverBudget,
        progressColor,
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
  
  // Determine how many to display
  const displayBudgets = showAll ? budgetProgress : budgetProgress.slice(0, maxItems);

  return (
    <div className="budget-progress-list">
      {displayBudgets.map((budget) => (
        <div key={budget.id} className="budget-progress-item">
          {/* Row 1: Period chip and Amount */}
          <div className="budget-progress-row-1">
            <span className="budget-period-chip">
              {getPeriodLabel(budget.period)}
            </span>
            <div className="budget-amounts">
              <span 
                className="budget-spent" 
                style={{ color: budget.progressColor }}
              >
                ${budget.spent.toFixed(2)}
              </span>
              <span className="budget-separator"> / </span>
              <span className="budget-total">${budget.amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Row 2: Category name + Status */}
          <div className="budget-progress-row-2">
            <span className="budget-category-name">{budget.categoryName}</span>
            {budget.isOverBudget ? (
              <span className="budget-status-text error-text">{t('overBudget')}</span>
            ) : (
              <span className="budget-status-text success-text">${budget.remaining.toFixed(2)} {t('remaining')}</span>
            )}
          </div>

          {/* Row 3: Progress bar and percentage */}
          <div className="budget-progress-row-3">
            <div className="budget-progress-bar">
              <div
                className="budget-progress-fill"
                style={{ 
                  width: `${Math.min(100, budget.percentage)}%`,
                  backgroundColor: budget.progressColor,
                }}
              />
            </div>
            <span className="budget-percentage">{budget.percentage.toFixed(1)}%</span>
          </div>
        </div>
      ))}
      
      <ShowMoreButton
        totalCount={budgetProgress.length}
        visibleCount={maxItems}
        isExpanded={showAll}
        onToggle={() => setShowAll(!showAll)}
        itemLabel={t('budgets')}
      />
    </div>
  );
};

export default BudgetProgressWidget;
