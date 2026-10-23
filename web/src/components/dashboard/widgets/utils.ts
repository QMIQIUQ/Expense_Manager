import { getBillingCyclePeriod } from '../../../utils/budgetRollover';

/** Date-only ledgers use UTC dates in these widgets; share the calendar boundaries. */
export const getBillingCycleRange = (billingCycleDay: number) => {
  const safeDay = Number.isFinite(billingCycleDay) ? Math.min(Math.max(1, Math.floor(billingCycleDay)), 31) : 1;
  const { start, end } = getBillingCyclePeriod(safeDay);
  const cycleStart = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const cycleEnd = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate() - 1));
  return { cycleStart, cycleEnd };
};
