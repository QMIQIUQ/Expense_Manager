import { readCompleteExpensePeriod } from './expensePeriodReadService';
import { applyPendingOperations } from '../utils/pendingOperations';
import { anomalyRange, findSpendingAnomalies } from '../utils/spendingAnomalyRules';

export const readSpendingInsights = async (userId: string, today: string) => {
  const snapshot = await readCompleteExpensePeriod(userId, anomalyRange(today));
  return findSpendingAnomalies(applyPendingOperations('expenses', userId, snapshot.rows), today);
};
