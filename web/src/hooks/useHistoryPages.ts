import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHistoryPage, type HistoryCollection, type HistoryCursor, type HistoryRange } from '../services/historyService';
import { applyPendingOperations } from '../utils/pendingOperations';
import { offlineQueue, type QueuedOperation } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';

export interface HistoryPageSource { cached: boolean; cacheVersion?: string }

/** The default history path reads exactly one page, and advances only on demand. */
export const useHistoryPages = <T extends { id?: string; date: string }>(name: HistoryCollection, userId: string | undefined,
  range: HistoryRange | undefined, fallback: T[], onRowsLoaded?: (rows: T[], source: HistoryPageSource) => void) => {
  const key = `${userId ?? ''}:${name}:${range?.startDate ?? ''}:${range?.endDate ?? ''}`;
  const [state, setState] = useState<{ key: string; rows: T[]; hasMore: boolean; complete: boolean }>({ key: '', rows: [], hasMore: true, complete: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [pendingOperations, setPendingOperations] = useState(() => offlineQueue.getAll());
  const generation = useRef(0);
  const cursor = useRef<HistoryCursor>();
  const snapshot = useRef<{ cached: boolean; version?: string }>();
  const busy = useRef(false);
  const callback = useRef(onRowsLoaded); callback.current = onRowsLoaded;
  const load = useCallback(async (reset = false) => {
    if (!userId || busy.current) return;
    busy.current = true; setLoading(true); setError(undefined);
    const version = generation.current;
    try {
      let replace = reset;
      let page = await getHistoryPage<T>(name, userId, range, replace ? undefined : cursor.current);
      if (version !== generation.current) return;
      if (!replace && snapshot.current && (snapshot.current.cached !== !!page.cached || page.cached && snapshot.current.version !== page.cacheVersion)) {
        // A cursor belongs to its source snapshot. Never append a different revision.
        replace = true;
        page = await getHistoryPage<T>(name, userId, range);
        if (version !== generation.current) return;
      }
      if (page.cached && (!page.cacheVersion || sessionCache.getSnapshot(name, userId)?.version !== page.cacheVersion)) {
        throw Object.assign(new Error('The saved history changed. Retry from the first page.'), { code: 'stale-read' });
      }
      snapshot.current = { cached: !!page.cached, version: page.cacheVersion };
      cursor.current = page.cursor;
      setState((previous) => ({ key, rows: replace || previous.key !== key ? page.rows : [...new Map([...previous.rows, ...page.rows].map((row) => [row.id, row])).values()], hasMore: page.hasMore, complete: page.complete !== false }));
      callback.current?.(page.rows, { cached: !!page.cached, cacheVersion: page.cacheVersion });
    } catch (failure) {
      if (version === generation.current) setError(failure instanceof Error ? failure.message : 'History could not load');
    } finally {
      if (version === generation.current) { busy.current = false; setLoading(false); }
    }
  // range identity is represented by key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name, userId]);
  useEffect(() => {
    generation.current++; cursor.current = undefined; snapshot.current = undefined; busy.current = false;
    void load(true);
    const counter = generation;
    return () => { counter.current++; busy.current = false; };
  }, [load]);
  useEffect(() => {
    const projected = () => setPendingOperations(offlineQueue.getAll());
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; operations?: QueuedOperation[] }>).detail;
      if (detail?.userId !== userId || !detail.operations?.some((operation) =>
        operation.entity === name.slice(0, -1) || (name === 'expenses' && operation.entity === 'scheduledPaymentRecord'))) return;
      generation.current++; busy.current = false; cursor.current = undefined;
      void load(true);
    };
    const online = () => {
      generation.current++; busy.current = false; cursor.current = undefined; snapshot.current = undefined;
      void load(true);
    };
    const cacheChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string; userId?: string }>).detail;
      if (detail?.entity !== name || detail.userId !== userId || !snapshot.current?.cached ||
          sessionCache.getSnapshot(name, userId!)?.version === snapshot.current.version) return;
      generation.current++; busy.current = false; cursor.current = undefined; snapshot.current = undefined;
      setState({ key, rows: [], hasMore: true, complete: false });
      void load(true);
    };
    window.addEventListener('offline-queue-changed', projected);
    window.addEventListener('offline-operations-synced', synced);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    window.addEventListener('session-cache-updated', cacheChanged);
    return () => {
      window.removeEventListener('offline-queue-changed', projected);
      window.removeEventListener('offline-operations-synced', synced);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      window.removeEventListener('session-cache-updated', cacheChanged);
    };
  }, [key, load, name, userId]);
  const rows = useMemo(() => state.key === key ? state.rows : fallback.filter((row) => !userId || (row as { userId?: string }).userId === userId).slice(0, 100), [state.key, state.rows, key, fallback, userId]);
  const projected = useMemo(() => userId ? applyPendingOperations(name, userId, rows, pendingOperations) : rows, [name, userId, rows, pendingOperations]);
  const start = range?.startDate; const end = range?.endDate;
  const visible = useMemo(() => projected.filter((row) => !start || !end || row.date >= start && row.date <= end), [projected, start, end]);
  return { rows: visible,
    hasMore: !!userId && (state.key !== key || state.hasMore), loading, error, incomplete: state.key === key && !state.complete,
    loadMore: () => load(false), retry: () => load(true) };
};
