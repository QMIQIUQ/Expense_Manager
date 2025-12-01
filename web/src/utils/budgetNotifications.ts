import { Budget, Expense, Repayment } from '../types';
import { NotificationType } from '../contexts/NotificationContext';
import { getEffectiveBudgetAmount } from './budgetRollover';

interface BudgetAlert {
  budget: Budget;
  spent: number;
  percentage: number;
  type: NotificationType;
  message: string;
}

/**
 * Calculate the budget period based on budget type and billingCycleDay
 */
export function calculateBudgetPeriod(
  budget: Budget,
  billingCycleDay: number = 1
): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const startDate = new Date(budget.startDate);

  let periodStart: Date;
  let periodEnd: Date;

  switch (budget.period) {
    case 'weekly': {
      // Weekly budgets still use startDate for cycle calculation
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      periodStart = new Date(startDate.getTime() + weeksSinceStart * 7 * 24 * 60 * 60 * 1000);
      periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'monthly': {
      // Monthly budgets use billingCycleDay for consistency with Dashboard
      const currentDay = now.getDate();
      if (currentDay >= billingCycleDay) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      }
      break;
    }
    case 'yearly': {
      // Yearly budgets use startDate's month and day
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      if (now.getMonth() > startMonth || (now.getMonth() === startMonth && now.getDate() >= startDay)) {
        periodStart = new Date(now.getFullYear(), startMonth, startDay);
        periodEnd = new Date(now.getFullYear() + 1, startMonth, startDay);
      } else {
        periodStart = new Date(now.getFullYear() - 1, startMonth, startDay);
        periodEnd = new Date(now.getFullYear(), startMonth, startDay);
      }
      break;
    }
    default:
      periodStart = startDate;
      periodEnd = now;
  }

  return { periodStart, periodEnd };
}

/**
 * Calculate spending for a budget based on its period
 * Deducts repayments from expense amounts for accurate spending
 */
export function calculateBudgetSpending(
  budget: Budget,
  expenses: Expense[],
  billingCycleDay: number = 1,
  repayments: Repayment[] = []
): number {
  const { periodStart, periodEnd } = calculateBudgetPeriod(budget, billingCycleDay);
  
  // Build repayment lookup map
  const repaymentsByExpense: { [expenseId: string]: number } = {};
  for (const rep of repayments) {
    repaymentsByExpense[rep.expenseId] = (repaymentsByExpense[rep.expenseId] || 0) + rep.amount;
  }

  // Helper to get net amount after repayments
  const getNetAmount = (exp: Expense): number => {
    const repaid = repaymentsByExpense[exp.id || ''] || 0;
    return Math.max(0, exp.amount - repaid);
  };

  // Calculate spending in this period for this category (with repayment deduction)
  const spent = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      return exp.category === budget.categoryName &&
             expDate >= periodStart &&
             expDate < periodEnd;
    })
    .reduce((sum, exp) => sum + getNetAmount(exp), 0);

  return spent;
}

/**
 * Check all budgets and return alerts for those exceeding thresholds
 */
export function checkBudgetAlerts(
  budgets: Budget[],
  expenses: Expense[],
  lastChecked: Date | null,
  billingCycleDay: number = 1,
  repayments: Repayment[] = []
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const now = new Date();

  // Only check once per hour to avoid notification spam
  if (lastChecked && now.getTime() - lastChecked.getTime() < 60 * 60 * 1000) {
    return alerts;
  }

  for (const budget of budgets) {
    const spent = calculateBudgetSpending(budget, expenses, billingCycleDay, repayments);
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    const percentage = (spent / effectiveAmount) * 100;

    // Check if we should alert
    if (percentage >= 100) {
      // Over budget
      alerts.push({
        budget,
        spent,
        percentage,
        type: 'error',
        message: `🚨 Budget Exceeded: ${budget.categoryName} - Spent $${spent.toFixed(2)} of $${effectiveAmount.toFixed(2)} (${percentage.toFixed(0)}%)`,
      });
    } else if (percentage >= budget.alertThreshold) {
      // At or above alert threshold
      alerts.push({
        budget,
        spent,
        percentage,
        type: 'info',
        message: `⚠️ Budget Alert: ${budget.categoryName} - Spent $${spent.toFixed(2)} of $${effectiveAmount.toFixed(2)} (${percentage.toFixed(0)}%)`,
      });
    }
  }

  return alerts;
}

/**
 * Get a summary of budget status for notification badge
 */
export function getBudgetSummary(
  budgets: Budget[],
  expenses: Expense[],
  billingCycleDay: number = 1,
  repayments: Repayment[] = []
): {
  overBudget: number;
  nearThreshold: number;
  totalAlerts: number;
} {
  let overBudget = 0;
  let nearThreshold = 0;

  for (const budget of budgets) {
    const spent = calculateBudgetSpending(budget, expenses, billingCycleDay, repayments);
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    const percentage = (spent / effectiveAmount) * 100;

    if (percentage >= 100) {
      overBudget++;
    } else if (percentage >= budget.alertThreshold) {
      nearThreshold++;
    }
  }

  return {
    overBudget,
    nearThreshold,
    totalAlerts: overBudget + nearThreshold,
  };
}
