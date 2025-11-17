import { Budget, Expense } from '../types';
import { NotificationType } from '../contexts/NotificationContext';

interface BudgetAlert {
  budget: Budget;
  spent: number;
  percentage: number;
  type: NotificationType;
  message: string;
}

/**
 * Calculate spending for a budget based on its period
 */
export function calculateBudgetSpending(budget: Budget, expenses: Expense[]): number {
  const now = new Date();
  const startDate = new Date(budget.startDate);
  
  let periodStart: Date;
  let periodEnd: Date;

  switch (budget.period) {
    case 'weekly': {
      // Calculate current week based on start date
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      periodStart = new Date(startDate.getTime() + weeksSinceStart * 7 * 24 * 60 * 60 * 1000);
      periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'monthly': {
      // Calculate current month based on start date day
      const startDay = startDate.getDate();
      if (now.getDate() >= startDay) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), startDay);
      }
      break;
    }
    case 'yearly': {
      // Calculate current year based on start date
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

  // Calculate spending in this period for this category
  const spent = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      return exp.category === budget.categoryName &&
             expDate >= periodStart &&
             expDate < periodEnd;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  return spent;
}

/**
 * Check all budgets and return alerts for those exceeding thresholds
 */
export function checkBudgetAlerts(
  budgets: Budget[],
  expenses: Expense[],
  lastChecked: Date | null
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const now = new Date();

  // Only check once per hour to avoid notification spam
  if (lastChecked && now.getTime() - lastChecked.getTime() < 60 * 60 * 1000) {
    return alerts;
  }

  for (const budget of budgets) {
    const spent = calculateBudgetSpending(budget, expenses);
    const percentage = (spent / budget.amount) * 100;

    // Check if we should alert
    if (percentage >= 100) {
      // Over budget
      alerts.push({
        budget,
        spent,
        percentage,
        type: 'error',
        message: `🚨 Budget Exceeded: ${budget.categoryName} - Spent $${spent.toFixed(2)} of $${budget.amount.toFixed(2)} (${percentage.toFixed(0)}%)`,
      });
    } else if (percentage >= budget.alertThreshold) {
      // At or above alert threshold
      alerts.push({
        budget,
        spent,
        percentage,
        type: 'info',
        message: `⚠️ Budget Alert: ${budget.categoryName} - Spent $${spent.toFixed(2)} of $${budget.amount.toFixed(2)} (${percentage.toFixed(0)}%)`,
      });
    }
  }

  return alerts;
}

/**
 * Get a summary of budget status for notification badge
 */
export function getBudgetSummary(budgets: Budget[], expenses: Expense[]): {
  overBudget: number;
  nearThreshold: number;
  totalAlerts: number;
} {
  let overBudget = 0;
  let nearThreshold = 0;

  for (const budget of budgets) {
    const spent = calculateBudgetSpending(budget, expenses);
    const percentage = (spent / budget.amount) * 100;

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
