/**
 * Budget Rollover Utility
 * 
 * Calculates and applies budget rollover when a billing cycle ends.
 * Rollover allows unused budget from the previous period to carry over to the next.
 */

import { Budget, Expense, Repayment } from '../types';

interface RolloverResult {
  budgetId: string;
  previousRemaining: number;
  rolloverAmount: number;
  newAccumulatedRollover: number;
}

/**
 * Calculate the billing cycle period boundaries
 */
export function getBillingCyclePeriod(
  billingCycleDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  let cycleStart: Date;
  let cycleEnd: Date;

  if (currentDay >= billingCycleDay) {
    cycleStart = new Date(year, month, billingCycleDay);
    cycleEnd = new Date(year, month + 1, billingCycleDay);
  } else {
    cycleStart = new Date(year, month - 1, billingCycleDay);
    cycleEnd = new Date(year, month, billingCycleDay);
  }

  return { start: cycleStart, end: cycleEnd };
}

/**
 * Get the previous billing cycle period
 */
export function getPreviousBillingCyclePeriod(
  billingCycleDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const current = getBillingCyclePeriod(billingCycleDay, referenceDate);
  
  // Previous cycle ends when current cycle starts
  const prevEnd = new Date(current.start);
  
  // Previous cycle starts one month before
  const prevStart = new Date(prevEnd);
  prevStart.setMonth(prevStart.getMonth() - 1);
  
  return { start: prevStart, end: prevEnd };
}

/**
 * Calculate spent amount for a budget in a specific period
 */
export function calculateSpentInPeriod(
  categoryName: string,
  expenses: Expense[],
  repayments: Repayment[],
  periodStart: Date,
  periodEnd: Date
): number {
  // Get repayments indexed by expense ID
  const repaymentsByExpense: { [expenseId: string]: number } = {};
  repayments.forEach((r) => {
    if (r.expenseId) {
      repaymentsByExpense[r.expenseId] = (repaymentsByExpense[r.expenseId] || 0) + r.amount;
    }
  });

  // Calculate net expense amount in the period
  let totalSpent = 0;
  
  expenses
    .filter((exp) => exp.category === categoryName)
    .forEach((exp) => {
      const expDate = new Date(exp.date);
      if (expDate >= periodStart && expDate < periodEnd) {
        const repaid = repaymentsByExpense[exp.id!] || 0;
        const netAmount = Math.max(0, exp.amount - repaid);
        totalSpent += netAmount;
      }
    });

  return totalSpent;
}

/**
 * Calculate rollover amount for a budget
 * Returns the amount that should be rolled over to the next period
 */
export function calculateRolloverAmount(
  budget: Budget,
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number
): RolloverResult | null {
  // Only process monthly budgets with rollover enabled
  if (!budget.rolloverEnabled || budget.period !== 'monthly') {
    return null;
  }

  // Get previous period boundaries
  const { start: prevStart, end: prevEnd } = getPreviousBillingCyclePeriod(billingCycleDay);

  // Calculate spent in previous period
  const spent = calculateSpentInPeriod(
    budget.categoryName,
    expenses,
    repayments,
    prevStart,
    prevEnd
  );

  // Calculate remaining from previous period (budget + any previous rollover)
  const effectiveBudget = budget.amount + (budget.accumulatedRollover || 0);
  const remaining = Math.max(0, effectiveBudget - spent);

  // Apply rollover percentage
  const rolloverPercentage = budget.rolloverPercentage ?? 100;
  let rolloverAmount = (remaining * rolloverPercentage) / 100;

  // Apply rollover cap if set
  if (budget.rolloverCap !== undefined && budget.rolloverCap > 0) {
    rolloverAmount = Math.min(rolloverAmount, budget.rolloverCap);
  }

  // Round to 2 decimal places
  rolloverAmount = Math.round(rolloverAmount * 100) / 100;

  return {
    budgetId: budget.id!,
    previousRemaining: remaining,
    rolloverAmount,
    newAccumulatedRollover: rolloverAmount,
  };
}

/**
 * Check if a new billing cycle has started and rollover needs to be calculated
 */
export function shouldCalculateRollover(
  budget: Budget,
  billingCycleDay: number,
  lastRolloverDate?: string
): boolean {
  if (!budget.rolloverEnabled || budget.period !== 'monthly') {
    return false;
  }

  const { start: currentCycleStart } = getBillingCyclePeriod(billingCycleDay);
  
  // If no lastRolloverDate, we should calculate rollover
  if (!lastRolloverDate) {
    return true;
  }

  const lastRollover = new Date(lastRolloverDate);
  
  // If current cycle started after last rollover, we need to calculate again
  return currentCycleStart > lastRollover;
}

/**
 * Get the effective budget amount including rollover
 */
export function getEffectiveBudgetAmount(budget: Budget): number {
  if (!budget.rolloverEnabled) {
    return budget.amount;
  }
  return budget.amount + (budget.accumulatedRollover || 0);
}

/**
 * Format rollover information for display
 */
export function formatRolloverInfo(budget: Budget): string | null {
  if (!budget.rolloverEnabled || !budget.accumulatedRollover || budget.accumulatedRollover <= 0) {
    return null;
  }
  
  return `+$${budget.accumulatedRollover.toFixed(2)} rollover`;
}
