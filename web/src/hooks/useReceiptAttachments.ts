import { useEffect, useState } from 'react';
import type { ReceiptAttachment } from '../types/receiptAttachment';
import { listReceiptAttachments } from '../services/receiptAttachmentService';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
export const useReceiptAttachments = (userId: string, expenseId: string) => {
  const key = `${userId}:${expenseId}`;
  const [state, setState] = useState<{ key: string; rows: ReceiptAttachment[]; complete: boolean; error?: string }>({ key: '', rows: [], complete: false });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!userId || !expenseId) return;
    let live = true; let running = false; let requested = false;
    const local = () => {
      const snapshot = sessionCache.getSnapshot<ReceiptAttachment[]>('receiptAttachments', userId);
      const rows = applyPendingOperations('receiptAttachments', userId, snapshot?.data ?? []).filter((row) => row.expenseId === expenseId);
      if (live) setState((previous) => ({ key, rows, complete: snapshot?.coverage === `expense:${expenseId}` || previous.key === key && previous.complete }));
    };
    const load = async () => {
      requested = true; if (running) return; running = true;
      try {
        while (requested && live) {
          requested = false;
          try { const result = await listReceiptAttachments(userId, expenseId); if (live && !requested) setState({ key, ...result }); }
          catch (error) { if (live && !requested) setState((previous) => ({ key, rows: previous.key === key ? previous.rows : [], complete: false, error: String(error) })); }
        }
      } finally { running = false; }
    };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string; entities?: string[]; operations?: Array<{ entity: string }> }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (event.type === 'session-cache-updated') { if (detail?.entity === 'receiptAttachments') local(); return; }
      if (event.type === 'offline-queue-changed' && detail?.entities && !detail.entities.includes('receiptAttachment')) return;
      if (detail?.operations && !detail.operations.some((operation) => operation.entity === 'receiptAttachment')) return;
      local(); void load();
    };
    local(); void load();
    for (const event of ['session-cache-updated', 'offline-queue-changed', 'offline-operations-synced', 'online']) window.addEventListener(event, changed);
    return () => { live = false; for (const event of ['session-cache-updated', 'offline-queue-changed', 'offline-operations-synced', 'online']) window.removeEventListener(event, changed); };
  }, [userId, expenseId, key, refresh]);
  return { ...(state.key === key ? state : { key, rows: [], complete: false }), reload: () => setRefresh((value) => value + 1) };
};
