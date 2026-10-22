import type { Income } from '../types';
import type { IncomeBudgetRange } from '../utils/incomeLinkedBudget';
import { offlineQueue } from '../utils/offlineQueue';
import { applyPendingOperations } from '../utils/pendingOperations';
import { dataService } from './dataService';
import { readHistoryRange } from './historyService';

const running = new Map<string, Promise<Income[]>>();

/** Full, consistent cycle reads are independent of the income list's rendered page. */
export async function readIncomeBudgetCycle(userId: string, range: IncomeBudgetRange): Promise<Income[]> {
  await offlineQueue.initialize();
  const generation = dataService.generation('incomes', userId);
  const revision = offlineQueue.revision;
  const key = [userId, range.startDate, range.endDate, generation, revision].join(':');
  const existing = running.get(key);
  if (existing) return existing;
  const request = readHistoryRange<Income>('incomes', userId, { startDate: range.startDate, endDate: range.endDate })
    .then((rows) => {
      if (generation !== dataService.generation('incomes', userId) || revision !== offlineQueue.revision) {
        throw Object.assign(new Error('Income changed while reading its cycle'), { code: 'stale-read' });
      }
      // Apply edits that move previously out-of-range records into this cycle, too.
      // Do not replace the shared collection cache with this partial date range.
      return applyPendingOperations('incomes', userId, rows);
    }).finally(() => { if (running.get(key) === request) running.delete(key); });
  running.set(key, request);
  return request;
}
