import { useEffect, useState } from 'react';
import type { Repayment } from '../types';
import { readExpenseRepayments } from '../services/expenseRepaymentReadService';
import { applyPendingOperations } from '../utils/pendingOperations';

export const useExpenseRepayments = (userId: string, expenseId: string) => {
  const [state, setState] = useState<{ key: string; rows: Repayment[]; complete: boolean; error?: string }>({ key: '', rows: [], complete: false });
  const key = `${userId}:${expenseId}`;
  useEffect(() => {
    if (!userId || !expenseId) return;
    let live = true; let generation = 0;
    const project = (rows: Repayment[], operations?: Parameters<typeof applyPendingOperations>[3]) =>
      applyPendingOperations('repayments', userId, rows, operations).filter((row) => row.expenseId === expenseId);
    const load = async () => {
      const token = ++generation;
      try { const rows = await readExpenseRepayments(userId, expenseId); if (live && token === generation) setState({ key, rows: project(rows), complete: true }); }
      catch (error) { if (live && token === generation) setState((previous) => ({ key, rows: previous.key === key ? previous.rows : [], complete: false, error: String(error) })); }
    };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string; entities?: string[]; operations?: Parameters<typeof applyPendingOperations>[3] }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (detail?.operations && !detail.operations.some((operation) => operation.entity === 'repayment')) return;
      if (detail?.entity && detail.entity !== 'repayment') return;
      if (detail?.entities && !detail.entities.includes('repayment')) return;
      generation++;
      setState((previous) => previous.key === key ? { ...previous, rows: project(previous.rows, detail?.operations) } : previous);
      if (event.type === 'offline-operations-synced' || event.type === 'online') void load();
    };
    void load();
    for (const event of ['offline-queue-changed', 'offline-operations-synced', 'online']) window.addEventListener(event, changed);
    return () => { live = false; for (const event of ['offline-queue-changed', 'offline-operations-synced', 'online']) window.removeEventListener(event, changed); };
  }, [userId, expenseId, key]);
  return state.key === key ? state : { key, rows: [], complete: false };
};
