import { Card, BillingCycle, Expense, CashbackRule, CardStats, Category } from '../types';

/**
 * Get the billing day for a specific month, considering overrides
 */
export function getBillingDayForMonth(card: Card, year: number, month: number): number {
  // Check if there's an override for this specific month
  if (card.perMonthOverrides) {
    const override = card.perMonthOverrides.find(
      (o) => o.year === year && o.month === month
    );
    if (override) {
      return override.day;
    }
  }
  return card.billingDay;
}

/**
 * Calculate the current billing cycle for a card
 * Billing cycle runs from (billing_day of previous month) to (billing_day of current month - 1 day)
 * For example, if billing_day is 25:
 * - Cycle from Feb 25 to Mar 24
 * - Cycle from Mar 25 to Apr 24
 */
export function getCurrentBillingCycle(card: Card, referenceDate: Date = new Date()): BillingCycle {
  const today = new Date(referenceDate);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  // Get billing day for current month
  const billingDayThisMonth = getBillingDayForMonth(card, currentYear, currentMonth);

  let cycleStartYear: number;
  let cycleStartMonth: number;
  let cycleEndYear: number;
  let cycleEndMonth: number;

  // If we're before the billing day this month, the cycle started last month
  if (currentDay < billingDayThisMonth) {
    // Cycle: last month's billing day to (this month's billing day - 1)
    cycleEndYear = currentYear;
    cycleEndMonth = currentMonth;
    
    if (currentMonth === 1) {
      cycleStartYear = currentYear - 1;
      cycleStartMonth = 12;
    } else {
      cycleStartYear = currentYear;
      cycleStartMonth = currentMonth - 1;
    }
  } else {
    // Cycle: this month's billing day to (next month's billing day - 1)
    cycleStartYear = currentYear;
    cycleStartMonth = currentMonth;
    
    if (currentMonth === 12) {
      cycleEndYear = currentYear + 1;
      cycleEndMonth = 1;
    } else {
      cycleEndYear = currentYear;
      cycleEndMonth = currentMonth + 1;
    }
  }

  const cycleStartDay = getBillingDayForMonth(card, cycleStartYear, cycleStartMonth);
  const cycleEndDay = getBillingDayForMonth(card, cycleEndYear, cycleEndMonth);

  // Format: YYYY-MM-DD
  const startDate = `${cycleStartYear}-${String(cycleStartMonth).padStart(2, '0')}-${String(cycleStartDay).padStart(2, '0')}`;
  
  // End date is one day before the next billing day
  const endDateObj = new Date(cycleEndYear, cycleEndMonth - 1, cycleEndDay);
  endDateObj.setDate(endDateObj.getDate() - 1);
  const endDate = endDateObj.toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * Calculate the next billing date for a card
 */
export function getNextBillingDate(card: Card, referenceDate: Date = new Date()): string {
  const cycle = getCurrentBillingCycle(card, referenceDate);
  // Next billing date is one day after cycle end date
  const endDateObj = new Date(cycle.endDate);
  endDateObj.setDate(endDateObj.getDate() + 1);
  return endDateObj.toISOString().split('T')[0];
}

/**
 * Calculate total spending on a card during the current billing cycle
 */
export function calculateCurrentCycleSpending(
  card: Card,
  expenses: Expense[],
  referenceDate: Date = new Date()
): number {
  const cycle = getCurrentBillingCycle(card, referenceDate);
  
  return expenses
    .filter((expense) => {
      // Only count expenses linked to this card
      if (expense.cardId !== card.id) return false;
      
      // Check if expense date is within the billing cycle
      return expense.date >= cycle.startDate && expense.date <= cycle.endDate;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Calculate spending by category for a specific card in the current cycle
 */
export function calculateCategorySpending(
  card: Card,
  expenses: Expense[],
  categoryId: string,
  referenceDate: Date = new Date()
): number {
  const cycle = getCurrentBillingCycle(card, referenceDate);
  
  return expenses
    .filter((expense) => {
      if (expense.cardId !== card.id) return false;
      if (expense.date < cycle.startDate || expense.date > cycle.endDate) return false;
      // Match by category name (since expenses store category name, not ID)
      // We'll need to pass category mapping from the caller
      return expense.category === categoryId;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Calculate estimated cashback for a specific cashback rule
 */
export function calculateRuleCashback(
  rule: CashbackRule,
  categorySpend: number
): {
  estimatedCashback: number;
  requiredToReachCap: number;
  requiredToReachMinSpend: number;
  metMinSpend: boolean;
} {
  const metMinSpend = categorySpend >= rule.minSpendForRate;
  
  let rate: number;
  let cap: number;
  
  if (metMinSpend) {
    rate = rule.rateIfMet;
    cap = rule.capIfMet;
  } else {
    rate = rule.rateIfNotMet;
    cap = rule.capIfNotMet;
  }
  
  // Calculate cashback (minimum of calculated amount and cap)
  const calculatedCashback = categorySpend * rate;
  const estimatedCashback = Math.min(calculatedCashback, cap);
  
  // Calculate how much more spend is needed to reach cap
  const spendToReachCap = cap / rate;
  const requiredToReachCap = Math.max(0, Math.ceil(spendToReachCap - categorySpend));
  
  // Calculate how much more spend is needed to reach min spend threshold
  const requiredToReachMinSpend = metMinSpend ? 0 : Math.max(0, rule.minSpendForRate - categorySpend);
  
  return {
    estimatedCashback,
    requiredToReachCap,
    requiredToReachMinSpend,
    metMinSpend,
  };
}

/**
 * Calculate complete card statistics including all cashback rules
 */
export function calculateCardStats(
  card: Card,
  expenses: Expense[],
  categories: Category[],
  referenceDate: Date = new Date()
): CardStats {
  const currentCycleSpending = calculateCurrentCycleSpending(card, expenses, referenceDate);
  const availableCredit = card.cardLimit - currentCycleSpending;
  const nextBillingDate = getNextBillingDate(card, referenceDate);
  
  const cashbackByRule: CardStats['cashbackByRule'] = [];
  let estimatedTotalCashback = 0;
  
  if (card.cardType === 'cashback' && card.cashbackRules) {
    for (const rule of card.cashbackRules) {
      // Find the category
      const category = categories.find((cat) => cat.id === rule.linkedCategoryId);
      if (!category) continue;
      
      // Calculate spending in this category
      const categorySpend = calculateCategorySpending(card, expenses, category.name, referenceDate);
      
      // Calculate cashback for this rule
      const ruleResult = calculateRuleCashback(rule, categorySpend);
      
      estimatedTotalCashback += ruleResult.estimatedCashback;
      
      cashbackByRule.push({
        ruleId: rule.id || '',
        categoryName: category.name,
        categorySpend,
        estimatedCashback: ruleResult.estimatedCashback,
        requiredToReachCap: ruleResult.requiredToReachCap,
        requiredToReachMinSpend: ruleResult.requiredToReachMinSpend,
      });
    }
  }
  
  return {
    cardId: card.id || '',
    cardName: card.name,
    currentCycleSpending,
    availableCredit,
    estimatedTotalCashback,
    nextBillingDate,
    cashbackByRule,
  };
}
