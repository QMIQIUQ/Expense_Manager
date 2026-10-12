import { Budget, BudgetPeriod, OverallBudgetLimits } from '../types';
import { toBudgetBaseAmount } from './budgetCurrencyUtils';

export type BudgetAllocationValidation =
  | { valid: true; allocatedMinorUnits: number; limitMinorUnits?: number }
  | {
      valid: false;
      reason: 'invalid-limit' | 'invalid-allocation' | 'limit-below-allocation';
      allocatedMinorUnits?: number;
      limitMinorUnits?: number;
      period?: BudgetPeriod;
    };

export type BudgetAllocationInput = Pick<Budget, 'amount' | 'period' | 'currency' | 'exchangeRate'> & { id?: string };

const toMinorUnits = (amount: number): number => Math.round(amount * 100);

const getValidBaseAmount = (amount: number, budget: BudgetAllocationInput | Budget): number | null => {
  try {
    const baseAmount = toBudgetBaseAmount(amount, budget);
    return Number.isFinite(baseAmount) && baseAmount >= 0 ? baseAmount : null;
  } catch {
    return null;
  }
};

export function getAllocatedBudgetMinorUnits(
  budgets: Budget[],
  period: BudgetPeriod,
  excludedBudgetId?: string,
): number | null {
  let total = 0;
  for (const budget of budgets) {
    if (budget.period !== period || (excludedBudgetId && budget.id === excludedBudgetId)) continue;
    const baseAmount = getValidBaseAmount(budget.amount, budget);
    if (baseAmount === null) return null;
    total += toMinorUnits(baseAmount);
  }
  return total;
}

export function validateOverallBudgetLimit(
  budgets: Budget[],
  period: BudgetPeriod,
  proposedLimit: number,
): BudgetAllocationValidation {
  if (!Number.isFinite(proposedLimit) || proposedLimit < 0) {
    return { valid: false, reason: 'invalid-limit' };
  }

  const allocatedMinorUnits = getAllocatedBudgetMinorUnits(budgets, period);
  if (allocatedMinorUnits === null) return { valid: false, reason: 'invalid-allocation' };

  const limitMinorUnits = toMinorUnits(proposedLimit);
  if (limitMinorUnits < allocatedMinorUnits) {
    return { valid: false, reason: 'limit-below-allocation', allocatedMinorUnits, limitMinorUnits };
  }

  return { valid: true, allocatedMinorUnits, limitMinorUnits };
}

export function validateBudgetAllocationChange(
  budgets: Budget[],
  proposedBudget: BudgetAllocationInput,
  limits: OverallBudgetLimits | undefined,
  previousBudgetId?: string,
): BudgetAllocationValidation {
  const affectedPeriods = new Set<BudgetPeriod>([proposedBudget.period]);
  const previousBudget = previousBudgetId ? budgets.find((budget) => budget.id === previousBudgetId) : undefined;
  if (previousBudget) affectedPeriods.add(previousBudget.period);
  const limitedPeriods = [...affectedPeriods].filter((period) => limits?.[period] !== undefined);
  if (limitedPeriods.length === 0) return { valid: true, allocatedMinorUnits: 0 };

  let proposedAllocatedMinorUnits = 0;
  for (const period of limitedPeriods) {
    let total = 0;
    for (const budget of budgets) {
      if ((previousBudgetId && budget.id === previousBudgetId) || budget.period !== period) continue;
      const baseAmount = getValidBaseAmount(budget.amount, budget);
      if (baseAmount === null) {
        return { valid: false, reason: 'invalid-allocation' };
      }
      total += toMinorUnits(baseAmount);
    }

    if (proposedBudget.period === period) {
      const proposedBaseAmount = getValidBaseAmount(proposedBudget.amount, proposedBudget);
      if (proposedBaseAmount === null) {
        return { valid: false, reason: 'invalid-allocation' };
      }
      total += toMinorUnits(proposedBaseAmount);
    }

    proposedAllocatedMinorUnits = total;
    const limit = limits?.[period];
    if (limit !== undefined) {
      if (!Number.isFinite(limit) || limit < 0) return { valid: false, reason: 'invalid-limit' };
      const limitMinorUnits = toMinorUnits(limit);
      if (total > limitMinorUnits) {
        return { valid: false, reason: 'limit-below-allocation', allocatedMinorUnits: total, limitMinorUnits, period };
      }
    }
  }

  return { valid: true, allocatedMinorUnits: proposedAllocatedMinorUnits };
}

export function validateBudgetAllocationBatch(
  budgets: Budget[],
  proposedBudgets: BudgetAllocationInput[],
  limits: OverallBudgetLimits | undefined,
): BudgetAllocationValidation {
  const periods = new Set(proposedBudgets
    .map((budget) => budget.period)
    .filter((period) => limits?.[period] !== undefined));
  if (periods.size === 0) return { valid: true, allocatedMinorUnits: 0 };
  let finalAllocatedMinorUnits = 0;

  for (const period of periods) {
    const existing = getAllocatedBudgetMinorUnits(budgets, period);
    if (existing === null) return { valid: false, reason: 'invalid-allocation' };

    let proposed = existing;
    for (const budget of proposedBudgets) {
      if (budget.period !== period) continue;
      const baseAmount = getValidBaseAmount(budget.amount, budget);
      if (baseAmount === null) {
        return { valid: false, reason: 'invalid-allocation' };
      }
      proposed += toMinorUnits(baseAmount);
    }

    finalAllocatedMinorUnits = proposed;
    const limit = limits?.[period];
    if (limit !== undefined) {
      if (!Number.isFinite(limit) || limit < 0) return { valid: false, reason: 'invalid-limit' };
      const limitMinorUnits = toMinorUnits(limit);
      if (proposed > limitMinorUnits) {
        return { valid: false, reason: 'limit-below-allocation', allocatedMinorUnits: proposed, limitMinorUnits, period };
      }
    }
  }

  return { valid: true, allocatedMinorUnits: finalAllocatedMinorUnits };
}
