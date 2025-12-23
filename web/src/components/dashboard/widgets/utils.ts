/**
 * Calculate the current billing cycle range based on the configured billing day (1-31).
 * Handles months with fewer days by clamping to the month's last day and normalizes
 * invalid inputs into the supported range to avoid invalid dates.
 * @param billingCycleDay Day of month the cycle resets (1-31). Values outside this range are clamped.
 */
export const getBillingCycleRange = (billingCycleDay: number) => {
  const now = new Date();
  const safeBillingDay = Math.min(Math.max(1, Math.floor(billingCycleDay)), 31);

  const clampDayForMonth = (year: number, monthIndex: number, day: number) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(day, daysInMonth);
  };

  const clampedBillingDayThisMonth = clampDayForMonth(now.getFullYear(), now.getMonth(), safeBillingDay);
  const cycleStartMonthOffset = now.getDate() >= clampedBillingDayThisMonth ? 0 : -1;

  const cycleStartMonthDate = new Date(now.getFullYear(), now.getMonth() + cycleStartMonthOffset, 1);
  const cycleStartYear = cycleStartMonthDate.getFullYear();
  const cycleStartMonth = cycleStartMonthDate.getMonth();
  const cycleStartDay = clampDayForMonth(cycleStartYear, cycleStartMonth, safeBillingDay);
  const cycleStart = new Date(cycleStartYear, cycleStartMonth, cycleStartDay);

  const nextCycleMonthDate = new Date(cycleStartYear, cycleStartMonth + 1, 1);
  const nextCycleDay = clampDayForMonth(
    nextCycleMonthDate.getFullYear(),
    nextCycleMonthDate.getMonth(),
    safeBillingDay
  );
  const nextCycleStart = new Date(nextCycleMonthDate.getFullYear(), nextCycleMonthDate.getMonth(), nextCycleDay);

  const cycleEnd = new Date(nextCycleStart.getTime() - 24 * 60 * 60 * 1000);

  return { cycleStart, cycleEnd };
};
