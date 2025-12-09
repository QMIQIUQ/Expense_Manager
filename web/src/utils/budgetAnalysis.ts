/**
 * Budget Analysis - Automatic budget adjustment suggestions
 * Phase 3.3 Implementation
 * 
 * Analyzes spending patterns and suggests budget adjustments when:
 * - Consistently over budget (>10%) for 3+ months
 * - Consistently under budget (<50% usage) for 3+ months
 */

import { Budget, Expense, Repayment } from '../types';
import { getBillingCyclePeriod } from './budgetRollover';

export interface BudgetAdjustmentSuggestion {
  budgetId: string;
  categoryName: string;
  currentAmount: number;
  suggestedAmount: number;
  reason: 'consistently_over' | 'consistently_under';
  averageSpending: number;
  usageHistory: number[]; // Last N months usage percentages
  confidence: 'high' | 'medium' | 'low';
}

interface MonthlySpending {
  period: string; // YYYY-MM format
  spent: number;
}

/**
 * Get spending history for a category over the last N months
 */
export function getSpendingHistory(
  categoryName: string,
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number,
  months: number = 6
): MonthlySpending[] {
  const history: MonthlySpending[] = [];
  const now = new Date();

  // Build repayment lookup
  const repaymentsByExpense: { [expenseId: string]: number } = {};
  repayments.forEach((r) => {
    if (r.expenseId) {
      repaymentsByExpense[r.expenseId] = (repaymentsByExpense[r.expenseId] || 0) + r.amount;
    }
  });

  // Calculate for each month
  for (let i = 0; i < months; i++) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, billingCycleDay);
    const { start, end } = getBillingCyclePeriod(billingCycleDay, refDate);

    // Calculate spending in this period
    let spent = 0;
    expenses
      .filter((exp) => exp.category === categoryName)
      .forEach((exp) => {
        const expDate = new Date(exp.date);
        if (expDate >= start && expDate < end) {
          const repaid = repaymentsByExpense[exp.id!] || 0;
          spent += Math.max(0, exp.amount - repaid);
        }
      });

    const periodLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    history.push({ period: periodLabel, spent });
  }

  return history.reverse(); // Oldest first
}

/**
 * Calculate usage percentages for a budget over history
 */
function getUsagePercentages(
  budget: Budget,
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number,
  months: number = 3
): number[] {
  const history = getSpendingHistory(
    budget.categoryName,
    expenses,
    repayments,
    billingCycleDay,
    months
  );

  return history.map((h) => {
    if (budget.amount <= 0) return 0;
    return (h.spent / budget.amount) * 100;
  });
}

/**
 * Analyze a budget and generate adjustment suggestion if needed
 */
export function analyzeBudget(
  budget: Budget,
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number
): BudgetAdjustmentSuggestion | null {
  // Only analyze monthly budgets
  if (budget.period !== 'monthly') {
    return null;
  }

  const usageHistory = getUsagePercentages(budget, expenses, repayments, billingCycleDay, 3);
  
  // Need at least 3 months of data
  if (usageHistory.length < 3) {
    return null;
  }

  const history = getSpendingHistory(budget.categoryName, expenses, repayments, billingCycleDay, 3);
  const averageSpending = history.reduce((a, b) => a + b.spent, 0) / history.length;

  // Check for consistently over budget (>110% for 3 months)
  const overBudgetCount = usageHistory.filter((u) => u > 110).length;
  if (overBudgetCount >= 3) {
    // Suggest increasing budget to average spending + 10% buffer
    const suggestedAmount = Math.ceil(averageSpending * 1.1);
    
    // Calculate confidence based on spending consistency
    const variance = calculateVariance(usageHistory);
    const confidence = variance < 15 ? 'high' : variance < 30 ? 'medium' : 'low';

    return {
      budgetId: budget.id!,
      categoryName: budget.categoryName,
      currentAmount: budget.amount,
      suggestedAmount,
      reason: 'consistently_over',
      averageSpending,
      usageHistory,
      confidence,
    };
  }

  // Check for consistently under budget (<50% for 3 months)
  const underBudgetCount = usageHistory.filter((u) => u < 50).length;
  if (underBudgetCount >= 3) {
    // Suggest decreasing budget to average spending + 20% buffer
    const suggestedAmount = Math.ceil(averageSpending * 1.2);
    
    // Only suggest if the reduction is significant (>20%)
    if (suggestedAmount < budget.amount * 0.8) {
      const variance = calculateVariance(usageHistory);
      const confidence = variance < 15 ? 'high' : variance < 30 ? 'medium' : 'low';

      return {
        budgetId: budget.id!,
        categoryName: budget.categoryName,
        currentAmount: budget.amount,
        suggestedAmount,
        reason: 'consistently_under',
        averageSpending,
        usageHistory,
        confidence,
      };
    }
  }

  return null;
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Get all budget adjustment suggestions
 */
export function getAllBudgetSuggestions(
  budgets: Budget[],
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number
): BudgetAdjustmentSuggestion[] {
  const suggestions: BudgetAdjustmentSuggestion[] = [];

  for (const budget of budgets) {
    const suggestion = analyzeBudget(budget, expenses, repayments, billingCycleDay);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  // Sort by confidence (high first) and then by absolute difference
  return suggestions.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    }
    return Math.abs(b.suggestedAmount - b.currentAmount) - Math.abs(a.suggestedAmount - a.currentAmount);
  });
}

/**
 * Get translation key for suggestion reason
 */
export function getSuggestionReasonKey(reason: 'consistently_over' | 'consistently_under'): string {
  return reason === 'consistently_over' ? 'suggestionOverBudget' : 'suggestionUnderBudget';
}
