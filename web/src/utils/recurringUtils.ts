import { RecurringExpense } from '../types';

/**
 * Calculate the next due date for a recurring expense based on its frequency
 */
export const getNextDueDate = (expense: RecurringExpense): Date | null => {
  if (!expense.isActive) return null;
  
  const startDate = new Date(expense.startDate);
  const now = new Date();
  
  // If endDate exists and has passed, no more dues
  if (expense.endDate) {
    const endDate = new Date(expense.endDate);
    if (now > endDate) return null;
  }
  
  // If we have a lastGenerated date, calculate from there; otherwise from startDate
  const lastDate = expense.lastGenerated ? new Date(expense.lastGenerated) : startDate;
  
  // Calculate next due date based on frequency
  const nextDue = new Date(lastDate);
  
  switch (expense.frequency) {
    case 'daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
      
    case 'weekly':
      // If dayOfWeek is specified, find next occurrence of that day
      if (expense.dayOfWeek !== undefined) {
        const currentDay = nextDue.getDay();
        // If we're already on the target day and have a valid lastGenerated date, add 7 days
        // Otherwise, calculate days until next occurrence of target day
        const hasValidLastGenerated = expense.lastGenerated && !isNaN(new Date(expense.lastGenerated).getTime());
        if (currentDay === expense.dayOfWeek && hasValidLastGenerated) {
          nextDue.setDate(nextDue.getDate() + 7);
        } else {
          // Calculate days to add: (target - current + 7) % 7
          // If result is 0 (already on target day), and no lastGenerated, use 0 (today)
          let daysToAdd = (expense.dayOfWeek - currentDay + 7) % 7;
          // If not on target day, ensure we add at least 1 day
          if (daysToAdd === 0 && currentDay !== expense.dayOfWeek) {
            daysToAdd = 7;
          }
          nextDue.setDate(nextDue.getDate() + daysToAdd);
        }
      } else {
        nextDue.setDate(nextDue.getDate() + 7);
      }
      break;
      
    case 'monthly':
      // If dayOfMonth is specified, go to that day of next month
      if (expense.dayOfMonth !== undefined) {
        nextDue.setMonth(nextDue.getMonth() + 1);
        // Handle edge cases like Feb 31 -> Feb 28/29
        // Using Date constructor with day=0 returns the last day of the previous month.
        // Since we use month+1, this gives us the last day of the current month.
        const lastDayOfMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
        nextDue.setDate(Math.min(expense.dayOfMonth, lastDayOfMonth));
      } else {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      break;
      
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }
  
  // Return the next due date even if it's in the past (overdue)
  return nextDue;
};

/**
 * Check if a recurring expense is due today or overdue
 */
export const isDueToday = (expense: RecurringExpense): boolean => {
  const nextDue = getNextDueDate(expense);
  if (!nextDue) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextDueDate = new Date(nextDue);
  nextDueDate.setHours(0, 0, 0, 0);
  
  // Include both today's bills and overdue bills
  return nextDueDate < tomorrow;
};

/**
 * Check if a recurring expense should show in the due notifications
 * It should show if it's due today AND hasn't been viewed today
 */
export const shouldShowDueNotification = (expense: RecurringExpense): boolean => {
  if (!isDueToday(expense)) return false;
  
  // If never viewed, show notification
  if (!expense.lastViewedDue) return true;
  
  // Check if lastViewedDue was today
  const lastViewed = new Date(expense.lastViewedDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastViewed.setHours(0, 0, 0, 0);
  
  // If last viewed was before today, show notification again
  return lastViewed < today;
};

/**
 * Get all recurring expenses that should show due notifications
 */
export const getDueRecurringExpenses = (expenses: RecurringExpense[]): RecurringExpense[] => {
  return expenses.filter(shouldShowDueNotification);
};
