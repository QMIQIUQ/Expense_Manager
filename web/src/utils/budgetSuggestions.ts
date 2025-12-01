import { Expense, Repayment } from '../types';

interface BudgetSuggestion {
  categoryName: string;
  suggestedAmount: number;
  averageSpending: number;
  maxSpending: number;
  minSpending: number;
  monthsAnalyzed: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate budget suggestions based on historical spending
 */
export function calculateBudgetSuggestions(
  expenses: Expense[],
  repayments: Repayment[],
  categoryName: string,
  billingCycleDay: number = 1,
  monthsToAnalyze: number = 3
): BudgetSuggestion | null {
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

  // Get spending by month for this category
  const now = new Date();
  const monthlySpending: number[] = [];

  for (let i = 1; i <= monthsToAnalyze; i++) {
    // Calculate billing cycle for past months
    // Go back i months from current cycle
    const cycleStart = new Date(now.getFullYear(), now.getMonth() - i, billingCycleDay);
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, billingCycleDay);

    // Calculate spending in this period (cycleEnd is exclusive)
    const spent = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return (
          exp.category === categoryName &&
          expDate >= cycleStart &&
          expDate < cycleEnd
        );
      })
      .reduce((sum, exp) => sum + getNetAmount(exp), 0);

    if (spent > 0) {
      monthlySpending.push(spent);
    }
  }

  // Not enough data
  if (monthlySpending.length === 0) {
    return null;
  }

  const averageSpending = monthlySpending.reduce((a, b) => a + b, 0) / monthlySpending.length;
  const maxSpending = Math.max(...monthlySpending);
  const minSpending = Math.min(...monthlySpending);

  // Add 10% buffer to average
  const suggestedAmount = Math.ceil(averageSpending * 1.1);

  // Determine confidence based on data consistency
  const variance = monthlySpending.reduce((sum, val) => sum + Math.pow(val - averageSpending, 2), 0) / monthlySpending.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = averageSpending > 0 ? stdDev / averageSpending : 0;

  let confidence: 'high' | 'medium' | 'low';
  if (monthlySpending.length >= 3 && coefficientOfVariation < 0.2) {
    confidence = 'high';
  } else if (monthlySpending.length >= 2 && coefficientOfVariation < 0.4) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    categoryName,
    suggestedAmount,
    averageSpending,
    maxSpending,
    minSpending,
    monthsAnalyzed: monthlySpending.length,
    confidence,
  };
}

/**
 * Get all budget suggestions for categories with spending history
 */
export function getAllBudgetSuggestions(
  expenses: Expense[],
  repayments: Repayment[],
  billingCycleDay: number = 1,
  monthsToAnalyze: number = 3
): BudgetSuggestion[] {
  // Get unique categories from expenses
  const categories = [...new Set(expenses.map((exp) => exp.category))];

  const suggestions: BudgetSuggestion[] = [];

  for (const category of categories) {
    const suggestion = calculateBudgetSuggestions(
      expenses,
      repayments,
      category,
      billingCycleDay,
      monthsToAnalyze
    );
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  // Sort by average spending (highest first)
  return suggestions.sort((a, b) => b.averageSpending - a.averageSpending);
}
