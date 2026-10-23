import type { QueuedOperation } from '../utils/offlineQueue';
import { cacheEntityFor } from '../utils/pendingOperations';
import type { CacheableEntity } from '../utils/sessionCache';

export const affectedEntities = (operations: Pick<QueuedOperation, 'entity'>[]): Set<CacheableEntity> => {
  const entities = new Set<CacheableEntity>();
  for (const operation of operations) {
    entities.add(cacheEntityFor(operation.entity));
    if (['expense', 'income', 'repayment', 'transfer', 'scheduledPaymentRecord'].includes(operation.entity)) {
      entities.add('banks');
      entities.add('ewallets');
    }
    if (operation.entity === 'expense') { entities.add('transfers'); entities.add('scheduledPaymentRecords'); }
    if (operation.entity === 'transfer') entities.add('expenses');
    if (operation.entity === 'repayment') entities.add('expenses');
    if (operation.entity === 'scheduledPaymentRecord') entities.add('expenses');
  }
  return entities;
};

/** Invalidations arriving during a request are retained for a subsequent pass. */
export const createRefreshCoordinator = (refresh: (entities: Set<CacheableEntity>) => Promise<void>) => {
  const pending = new Set<CacheableEntity>();
  let running = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const drain = async () => {
    if (disposed || running || !pending.size) return;
    running = true;
    try {
      while (pending.size && !disposed) {
        const batch = new Set(pending);
        pending.clear();
        try { await refresh(batch); }
        catch (error) { console.error('Scoped refresh failed:', error); }
      }
    } finally { running = false; }
  };
  return {
    request(entities: Iterable<CacheableEntity>) {
      for (const entity of entities) pending.add(entity);
      clearTimeout(timer);
      timer = setTimeout(() => { void drain(); }, 75);
    },
    dispose() { disposed = true; pending.clear(); clearTimeout(timer); },
  };
};
