export const getBillingCycleRange = (billingCycleDay: number) => {
  const now = new Date();
  const currentDay = now.getDate();
  let cycleStart: Date;
  let cycleEnd: Date;

  if (currentDay >= billingCycleDay) {
    cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
    cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
  } else {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
    cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
  }

  return { cycleStart, cycleEnd };
};
