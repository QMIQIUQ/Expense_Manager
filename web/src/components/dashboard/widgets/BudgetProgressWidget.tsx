import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { WidgetProps } from './types';
import ShowMoreButton from './ShowMoreButton';
import { getEffectiveBudgetAmount } from '../../../utils/budgetRollover';
import { formatDateRangeShort } from '../../../utils/dateUtils';

const BudgetProgressWidget: React.FC<WidgetProps & { onNavigateToBudgets?: () => void }> = ({ budgets, expenses, repayments, billingCycleDay = 1, size = 'medium', onNavigateToBudgets }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
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

  // Build repayment lookup map
  const repaymentsByExpense = React.useMemo(() => {
    const map: { [expenseId: string]: number } = {};
    for (const rep of repayments) {
      map[rep.expenseId] = (map[rep.expenseId] || 0) + rep.amount;
    }
    return map;
  }, [repayments]);

  // Helper to get net amount after repayments
  const getNetAmount = React.useCallback((exp: { id?: string; amount: number }): number => {
    const repaid = repaymentsByExpense[exp.id || ''] || 0;
    return Math.max(0, exp.amount - repaid);
  }, [repaymentsByExpense]);

  // Format period range for display
  const formatPeriodRange = React.useCallback((budget: { period: string }, cycleStart: Date, cycleEnd: Date): string => {
    // Convert dates to YYYY-MM-DD format for the utility function
    const startStr = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, '0')}-${String(cycleStart.getDate()).padStart(2, '0')}`;
    const endStr = `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, '0')}-${String(cycleEnd.getDate()).padStart(2, '0')}`;
    
    // For monthly budgets, show the billing cycle range
    if (budget.period === 'monthly') {
      return formatDateRangeShort(startStr, endStr, dateFormat);
    }
    
    // For weekly/yearly, just return empty for now (can be extended)
    return '';
  }, [dateFormat]);

  // Calculate billing cycle
  const { cycleStart, cycleEnd, daysInCycle, daysPassed, daysRemaining } = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }

    // Calculate days in cycle
    const daysInCycle = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.ceil((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = daysInCycle - daysPassed;

    return { cycleStart, cycleEnd, daysInCycle, daysPassed, daysRemaining };
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return budgets.map((budget) => {
      // Get effective budget amount (including rollover)
      const effectiveAmount = getEffectiveBudgetAmount(budget);
      
      // Filter expenses for this category in the cycle
      const categoryExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        const matchesCategory = exp.category === budget.categoryName;
        const inCycle = expDate >= cycleStart && expDate <= cycleEnd;
        return matchesCategory && inCycle;
      });

      const spent = categoryExpenses.reduce((sum, exp) => sum + getNetAmount(exp), 0);

      // Calculate today's spending
      const todaySpent = categoryExpenses
        .filter((exp) => {
          const expDate = new Date(exp.date);
          return expDate >= today && expDate < tomorrow;
        })
        .reduce((sum, exp) => sum + getNetAmount(exp), 0);

      const percentage = effectiveAmount > 0 ? (spent / effectiveAmount) * 100 : 0;
      const remaining = Math.max(0, effectiveAmount - spent);
      const isOverBudget = spent > effectiveAmount;
      const progressColor = getProgressColor(percentage, budget.alertThreshold || 80);
      const periodRange = formatPeriodRange(budget, cycleStart, cycleEnd);

      // Daily budget calculations (only for monthly budgets)
      let dailyBudget = 0;
      let dailyRemaining = 0;
      let idealSpent = 0;
      let spendingPace: 'on-track' | 'under' | 'over' = 'on-track';

      if (budget.period === 'monthly' && daysInCycle > 0) {
        dailyBudget = effectiveAmount / daysInCycle;
        idealSpent = dailyBudget * daysPassed;
        dailyRemaining = daysRemaining > 0 ? remaining / daysRemaining : 0;

        // Determine spending pace
        if (spent > idealSpent * 1.1) {
          spendingPace = 'over';
        } else if (spent < idealSpent * 0.9) {
          spendingPace = 'under';
        }
      }

      return {
        ...budget,
        effectiveAmount,
        spent,
        remaining,
        percentage,
        isOverBudget,
        progressColor,
        periodRange,
        // Daily budget fields
        dailyBudget,
        dailyRemaining,
        todaySpent,
        idealSpent,
        spendingPace,
      };
    });
  }, [budgets, expenses, cycleStart, cycleEnd, daysInCycle, daysPassed, daysRemaining, getNetAmount, formatPeriodRange]);

  // Sort budget progress by percentage (high to low)
  const sortedBudgetProgress = React.useMemo(() => {
    return [...budgetProgress].sort((a, b) => b.percentage - a.percentage);
  }, [budgetProgress]);

  if (sortedBudgetProgress.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>🎯</span>
        <p>{t('noBudgets')}</p>
      </div>
    );
  }
  
  // Determine how many to display
  const displayBudgets = showAll ? sortedBudgetProgress : sortedBudgetProgress.slice(0, maxItems);

  return (
    <div className="budget-progress-list">
      {displayBudgets.map((budget) => (
        <div
          key={budget.id}
          className={`budget-progress-item ${onNavigateToBudgets ? 'clickable' : ''}`}
          onClick={onNavigateToBudgets}
          role={onNavigateToBudgets ? 'button' : undefined}
          tabIndex={onNavigateToBudgets ? 0 : undefined}
        >
          {/* Row 1: Period chip and Amount */}
          <div className="budget-progress-row-1">
            <div className="budget-period-info">
              <span className="budget-period-chip">
                {getPeriodLabel(budget.period)}
              </span>
              {budget.periodRange && (
                <span className="budget-period-range">
                  {budget.periodRange}
                </span>
              )}
              {budget.rolloverEnabled && (
                <span className="budget-rollover-badge" title={t('rolloverEnabled') || 'Rollover Enabled'}>🔄</span>
              )}
            </div>
            <div className="budget-amounts">
              <span 
                className="budget-spent" 
                style={{ color: budget.progressColor }}
              >
                ${budget.spent.toFixed(2)}
              </span>
              <span className="budget-separator"> / </span>
              <span className="budget-total">${budget.effectiveAmount.toFixed(2)}</span>
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

          {/* Row 2.5: Daily budget info (for monthly budgets) */}
          {budget.period === 'monthly' && budget.dailyBudget > 0 && (
            <div className="budget-daily-info">
              <div className="budget-daily-row">
                <span className="budget-daily-label">{t('dailyBudget') || 'Daily'}:</span>
                <span className="budget-daily-value">${budget.dailyBudget.toFixed(2)}</span>
              </div>
              <div className="budget-daily-row">
                <span className="budget-daily-label">{t('todaySpent') || 'Today'}:</span>
                <span className={`budget-daily-value ${budget.todaySpent > budget.dailyBudget ? 'over-daily' : ''}`}>
                  ${budget.todaySpent.toFixed(2)}
                </span>
              </div>
              {budget.spendingPace !== 'on-track' && (
                <span className={`budget-pace-indicator ${budget.spendingPace}`}>
                  {budget.spendingPace === 'over' ? '📈 ' + (t('spendingFast') || 'Spending fast') : '📉 ' + (t('spendingSlow') || 'Under pace')}
                </span>
              )}
            </div>
          )}

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
        totalCount={sortedBudgetProgress.length}
        visibleCount={maxItems}
        isExpanded={showAll}
        onToggle={() => setShowAll(!showAll)}
        itemLabel={t('budgets')}
      />
    </div>
  );
};

export default BudgetProgressWidget;
