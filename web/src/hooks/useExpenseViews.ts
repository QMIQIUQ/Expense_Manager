import { useEffect, useRef, useState } from 'react';
import type { UserSettings } from '../types';
import type { ExpenseViewPreferences } from '../types/expensePeriod';
import { userSettingsService } from '../services/userSettingsService';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { acceptLocalMutation } from '../services/acceptLocalMutation';
import { applyExpenseViewChange, readExpenseViews, type ExpenseViewChange } from '../utils/expenseViewPreferences';

const EMPTY: ExpenseViewPreferences = { version: 1, savedFilters: [] };
export const useExpenseViews = (userId?: string) => {
  const [state, setState] = useState<{ userId?: string; preferences: ExpenseViewPreferences; ready: boolean; error?: string }>({ preferences: EMPTY, ready: false });
  const owner = useRef(userId); owner.current = userId;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const show = (settings?: UserSettings | null) => {
      if (!live) return;
      const preferences = settings?.expenseViewPreferences;
      setState({ userId, ready: true, preferences: readExpenseViews(preferences) });
    };
    const local = () => show(applyPendingOperations('userSettings', userId, sessionCache.get<UserSettings>('userSettings', userId)));
    const load = () => { void userSettingsService.getOrCreate(userId, true).then(show).catch((error) => {
      local(); if (live) setState((previous) => ({ ...previous, error: String(error) }));
    }); };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (event.type === 'offline-operation-synced' && detail?.entity === 'userSettings') load();
      else if (event.type === 'session-cache-updated' && detail?.entity === 'userSettings' || event.type === 'offline-queue-changed') local();
    };
    if (sessionCache.get('userSettings', userId)) local();
    load();
    for (const event of ['session-cache-updated', 'offline-queue-changed', 'offline-operation-synced']) window.addEventListener(event, changed);
    return () => { live = false; for (const event of ['session-cache-updated', 'offline-queue-changed', 'offline-operation-synced']) window.removeEventListener(event, changed); };
  }, [userId]);
  const save = async (change: ExpenseViewChange) => {
    if (!userId || owner.current !== userId) throw new Error('Account changed');
    applyExpenseViewChange(state.preferences, change);
    await acceptLocalMutation({ entity: 'userSettings', type: 'update', payload: { id: userId, userId, updates: {}, expenseViewChange: change } });
  };
  return { ...(state.userId === userId ? state : { preferences: EMPTY, ready: false }), save };
};
