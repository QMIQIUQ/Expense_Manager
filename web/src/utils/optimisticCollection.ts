import type React from 'react';
import { dataService } from '../services/dataService';
import { applyPendingOperations } from './pendingOperations';
import type { CacheableEntity } from './sessionCache';

export type OptimisticCollectionRollback<T extends { id?: string }> =
  | { type: 'create'; id: string }
  | { type: 'update'; id: string; original?: T; fields: readonly (keyof T)[] }
  | { type: 'delete'; id: string; original?: T; index?: number };
type CollectionRollback<T extends { id?: string }> = OptimisticCollectionRollback<T> | ((rows: T[]) => T[]);

const rollbackRows = <T extends { id?: string }>(rows: T[], rollback: OptimisticCollectionRollback<T>): T[] => {
  if (rollback.type === 'create') return rows.filter((row) => row.id !== rollback.id);

  if (rollback.type === 'update') {
    if (!rollback.original) return rows;
    const restoredFields = Object.fromEntries(rollback.fields.map((field) => [field, rollback.original![field]])) as Partial<T>;
    return rows.map((row) => row.id === rollback.id ? { ...row, ...restoredFields } : row);
  }

  if (!rollback.original || rows.some((row) => row.id === rollback.id)) return rows;
  const next = [...rows];
  const index = Math.min(Math.max(rollback.index ?? next.length, 0), next.length);
  next.splice(index, 0, rollback.original);
  return next;
};

/** Roll back one failed local mutation, then reapply any other durable writes. */
export const reconcileOptimisticCollection = <T extends { id?: string }>(
  entity: CacheableEntity,
  userId: string,
  setRows: React.Dispatch<React.SetStateAction<T[]>>,
  rollback: CollectionRollback<T>,
): void => {
  const reconcile = (rows: T[]) => applyPendingOperations(entity, userId,
    typeof rollback === 'function' ? rollback(rows) : rollbackRows(rows, rollback));
  setRows(reconcile);
  dataService.updateCache<T[]>(entity, userId, reconcile);
};
