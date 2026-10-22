import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSettings } from '../contexts/UserSettingsContext';
import type { Budget, Income, IncomeLinkedBudgetSettings } from '../types';
import { calculateIncomeFunding, DEFAULT_INCOME_LINK, incomeBudgetRange, validIncomeLink } from '../utils/incomeLinkedBudget';
import { readIncomeBudgetCycle } from '../services/incomeBudgetData';
import { offlineQueue } from '../utils/offlineQueue';
import { networkStatus } from '../utils/networkStatus';
import { getTodayLocal } from '../utils/dateUtils';

export function useIncomeBudget(budgets: Budget[], active: boolean, billingCycleDay = 1, preview?: IncomeLinkedBudgetSettings) {
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();
  const uid = currentUser?.uid;
  const [today, setToday] = useState(getTodayLocal);
  const [retry, setRetry] = useState(0);
  const [, redraw] = useState(0);
  const range = useMemo(() => incomeBudgetRange(billingCycleDay,
    new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)))), [billingCycleDay, today]);
  const key = uid + ':' + range.startDate + ':' + range.endDate + ':' + today;
  const [snapshot, setSnapshot] = useState<{ key: string; rows: Income[]; status: 'ready' | 'loading' | 'incomplete' | 'error' }>({ key: '', rows: [], status: 'loading' });

  useEffect(() => {
    if (!active || !uid) return;
    let live = true;
    let requestId = 0;
    let scheduled = false;
    let staleRetries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = (fresh = true) => {
      if (!live || scheduled) return;
      if (fresh) { staleRetries = 0; clearTimeout(retryTimer); }
      // Fence the old read immediately, before the coalesced follow-up begins.
      const request = ++requestId;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (!live) return;
        setSnapshot((old) => ({ key, rows: old.key === key ? old.rows : [], status: 'loading' }));
        void readIncomeBudgetCycle(uid, range).then((rows) => {
          if (live && request === requestId) { staleRetries = 0; setSnapshot({ key, rows, status: 'ready' }); }
        }).catch((error: unknown) => {
          if (!live || request !== requestId) return;
          const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
          if (code === 'stale-read' && staleRetries < 3) {
            retryTimer = setTimeout(() => refresh(false), 50 * 2 ** staleRetries++);
            return;
          }
          setSnapshot({ key, rows: [], status: code === 'incomplete-cache' ? 'incomplete' : 'error' });
        });
      });
    };
    const cacheChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.userId === uid && detail.entity === 'incomes') refresh();
    };
    const queueChanged = (event: Event) => {
      const entities = (event as CustomEvent<{ entities?: string[] }>).detail?.entities;
      if (!entities || entities.includes('income')) refresh();
      if (!entities || entities.includes('income') || entities.includes('userSettings') || entities.includes('budget')) redraw((v) => v + 1);
    };
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.userId === uid && detail.entity === 'income') refresh();
    };
    const focus = () => { setToday(getTodayLocal()); refresh(); };
    const visibility = () => { if (document.visibilityState === 'visible') focus(); };
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 10);
    const dayTimer = setTimeout(() => setToday(getTodayLocal()), midnight.getTime() - Date.now());
    const unsubscribe = networkStatus.subscribe(() => refresh());
    window.addEventListener('session-cache-updated', cacheChanged);
    window.addEventListener('offline-queue-changed', queueChanged);
    window.addEventListener('offline-operation-synced', synced);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    refresh();
    return () => {
      live = false;
      clearTimeout(retryTimer);
      clearTimeout(dayTimer);
      unsubscribe();
      window.removeEventListener('session-cache-updated', cacheChanged);
      window.removeEventListener('offline-queue-changed', queueChanged);
      window.removeEventListener('offline-operation-synced', synced);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, uid, key, range, retry]);

  const ownedSettings = settings && (settings.userId === uid || settings.id === uid) ? settings : null;
  const config = preview ?? ownedSettings?.incomeLinkedBudget ?? DEFAULT_INCOME_LINK;
  const dataStatus = snapshot.key === key && active ? snapshot.status : 'loading';
  const funding = dataStatus === 'ready' && uid
    ? calculateIncomeFunding(uid, snapshot.rows, budgets, config, range) : null;
  const pending = offlineQueue.getAll().filter((op) => {
    const payload = op.payload as { userId?: string; incomeLinkedBudgetChange?: unknown };
    return payload.userId === uid && (op.entity === 'income' || op.entity === 'budget' ||
      op.entity === 'userSettings' && Boolean(payload.incomeLinkedBudgetChange));
  });
  return { range, funding, percentage: validIncomeLink(config) ? config.percentage : null, userId: uid, incomes: dataStatus === 'ready' ? snapshot.rows : [], sourceStatus: dataStatus,
    status: funding?.status === 'invalid' ? 'invalid' as const : dataStatus,
    pending: pending.length > 0, needsAttention: pending.some((op) => op.status === 'needs-attention'),
    retry: () => setRetry((value) => value + 1) };
}

export type IncomeBudgetState = ReturnType<typeof useIncomeBudget>;
