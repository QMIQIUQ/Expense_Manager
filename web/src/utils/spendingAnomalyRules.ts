import type { Expense } from '../types';
import { getExpenseBaseAmount } from './currencyUtils';
import { formatDateLocal } from './dateUtils';
import { roundMoney } from '../domain/money';

export interface SpendingAnomaly {
  category: string; currentAmount: number; baselineAmount: number; ratio: number;
  startDate: string; endDate: string; sampleCount: number;
}
export const anomalyRange = (today: string) => {
  const anchor = new Date(`${today}T12:00:00`);
  return { startDate: formatDateLocal(new Date(anchor.getFullYear(), anchor.getMonth() - 3, 1)), endDate: today };
};

/** Three preceding months, matched by day of month, gross booked MYR amounts. */
export const findSpendingAnomalies = (rows: Expense[], today: string): SpendingAnomaly[] => {
  const anchor = new Date(`${today}T12:00:00`);
  const currentMonth = today.slice(0, 7);
  const previousMonths = [1, 2, 3].map((offset) => formatDateLocal(new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1)).slice(0, 7));
  const groups = new Map<string, { current: number; currentCount: number; previous: number[]; sampleCount: number }>();
  for (const row of rows) {
    if (row.date > today || row.scheduledPaymentRecordId || Number(row.date.slice(8, 10)) > anchor.getDate()) continue;
    const month = row.date.slice(0, 7);
    if (month !== currentMonth && !previousMonths.includes(month)) continue;
    const amount = getExpenseBaseAmount(row);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const group = groups.get(row.category) ?? { current: 0, currentCount: 0, previous: [0, 0, 0], sampleCount: 0 };
    if (month === currentMonth) { group.current += amount; group.currentCount++; }
    else { group.previous[previousMonths.indexOf(month)] += amount; group.sampleCount++; }
    groups.set(row.category, group);
  }
  const result: SpendingAnomaly[] = [];
  for (const [category, group] of groups) {
    const baseline = [...group.previous].sort((a, b) => a - b)[1];
    if (group.sampleCount < 5 || group.currentCount < 3 || baseline <= 0 || group.current < baseline * 1.5 || group.current - baseline < 50) continue;
    result.push({ category, currentAmount: roundMoney(group.current, 'MYR'), baselineAmount: roundMoney(baseline, 'MYR'),
      ratio: group.current / baseline, sampleCount: group.sampleCount, startDate: `${currentMonth}-01`, endDate: today });
  }
  return result.sort((left, right) => (right.currentAmount - right.baselineAmount) - (left.currentAmount - left.baselineAmount));
};
