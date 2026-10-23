import { useEffect, useState } from 'react';
import type { ExpenseTag } from '../types';
import { expenseTagService } from '../services/expenseTagService';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';

export const useExpenseTags = (userId?: string) => {
  const [state, setState] = useState<{ userId?: string; rows: ExpenseTag[]; error?: string }>({ rows: [] });
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const show = (rows: ExpenseTag[]) => { if (live) setState({ userId, rows }); };
    const local = () => show(applyPendingOperations('expenseTags', userId, sessionCache.get<ExpenseTag[]>('expenseTags', userId) ?? []));
    const load = () => { void expenseTagService.list(userId, show).then(show).catch((error) => {
      if (live) setState({ userId, rows: applyPendingOperations('expenseTags', userId, sessionCache.get<ExpenseTag[]>('expenseTags', userId) ?? []), error: String(error) });
    }); };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string; entities?: string[] }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (event.type === 'offline-operation-synced' && detail?.entity === 'expenseTag') load();
      else if (event.type === 'offline-queue-changed' && (!detail?.entities || detail.entities.includes('expenseTag')) ||
        event.type === 'session-cache-updated' && detail?.entity === 'expenseTags') local();
    };
    local(); load();
    for (const event of ['offline-queue-changed', 'session-cache-updated', 'offline-operation-synced']) window.addEventListener(event, changed);
    return () => { live = false; for (const event of ['offline-queue-changed', 'session-cache-updated', 'offline-operation-synced']) window.removeEventListener(event, changed); };
  }, [userId]);
  return state.userId === userId ? state : { userId, rows: [] as ExpenseTag[] };
};
