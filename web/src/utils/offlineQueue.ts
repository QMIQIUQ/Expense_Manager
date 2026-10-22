import { sessionCache } from './sessionCache';
import { cacheEntityFor } from './pendingOperations';
import { dataEqual } from './dataEquality';
import { changeOutbox, migrateLegacyOutbox, readOutbox } from './indexedDbOutbox';
import { dependencyKeys, operationsOverlap } from './operationDependencies';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'budget' | 'recurring' | 'scheduledPayment' | 'scheduledPaymentRecord' | 'income' | 'card' | 'bank' | 'ewallet' | 'repayment' | 'transfer' | 'featureSettings' | 'quickExpensePreset' | 'userSettings' | 'dashboardLayout' | 'friendPreference';
  payload: unknown;
  timestamp: number;
  retryCount: number;
  status?: 'needs-attention';
  schemaVersion?: 1;
  sequence?: number;
  nextAttemptAt?: number;
  lastError?: string;
  lease?: { token: string; expiresAt: number };
  dependencies?: string[];
  legacyAmbiguous?: boolean;
  localSnapshot?: Record<string, unknown>;
}

type Mutation = Pick<QueuedOperation, 'type' | 'entity' | 'payload'>;
const MAX_RETRY = 5;
const LEASE_MS = 60_000;
let revision = 0;
const expenseVersions = new Map<string, number>();
let expenseViews = new Map<string, unknown[]>();
let snapshot: QueuedOperation[] = [];
let initialization: Promise<void> | undefined;
let refreshGeneration = 0;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('expense-outbox-v1') : undefined;
const entities = new Set(['expense', 'category', 'budget', 'recurring', 'scheduledPayment', 'scheduledPaymentRecord', 'income', 'card', 'bank', 'ewallet', 'repayment', 'transfer', 'featureSettings', 'quickExpensePreset', 'userSettings', 'dashboardLayout', 'friendPreference']);
const ownerOf = (operation: Mutation): unknown => (operation.payload as { userId?: unknown } | null)?.userId;
const completedBuffers = new Map<string, Map<string, QueuedOperation>>();
let completionTimer: ReturnType<typeof setTimeout> | undefined;
const notifyCompleted = (operations: QueuedOperation[], broadcast = true): void => {
  for (const operation of operations) {
    const owner = ownerOf(operation);
    if (typeof owner !== 'string') continue;
    const buffered = completedBuffers.get(owner) ?? new Map<string, QueuedOperation>();
    buffered.set(operation.id, operation);
    completedBuffers.set(owner, buffered);
  }
  if (broadcast && operations.length) channel?.postMessage({ type: 'completed', operations });
  if (completionTimer !== undefined) return;
  completionTimer = setTimeout(() => {
    completionTimer = undefined;
    for (const [userId, buffered] of completedBuffers) {
      const operations = [...buffered.values()];
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-operations-synced', { detail: { userId, operations } }));
        // Compatibility for feature components: once per entity, never once per row.
        for (const entity of new Set(operations.map((operation) => operation.entity))) {
          window.dispatchEvent(new CustomEvent('offline-operation-synced', { detail: { userId, entity } }));
        }
      }
    }
    completedBuffers.clear();
  }, 75);
};
const notify = (broadcast = true, entities?: QueuedOperation['entity'][]) => {
  // Claims, leases and identical storage refreshes do not change expense query content.
  const nextViews = new Map<string, unknown[]>();
  for (const operation of snapshot) {
    if (!['expense', 'scheduledPaymentRecord'].includes(operation.entity)) continue;
    const owner = ownerOf(operation);
    if (typeof owner !== 'string') continue;
    const rows = nextViews.get(owner) ?? [];
    rows.push({ id: operation.id, entity: operation.entity, type: operation.type, payload: operation.payload,
      localSnapshot: operation.localSnapshot, status: operation.status });
    nextViews.set(owner, rows);
  }
  for (const owner of new Set([...expenseViews.keys(), ...nextViews.keys()])) {
    if (!dataEqual(expenseViews.get(owner) ?? [], nextViews.get(owner) ?? [])) expenseVersions.set(owner, (expenseVersions.get(owner) ?? 0) + 1);
  }
  expenseViews = nextViews;
  revision++;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { entities } }));
  if (broadcast) channel?.postMessage('changed');
};
const validate = (value: unknown): QueuedOperation => {
  const row = value as QueuedOperation | null;
  if (!row || typeof row.id !== 'string' || !row.id || !entities.has(row.entity) ||
      !['create', 'update', 'delete'].includes(row.type) || !Number.isFinite(row.timestamp) ||
      !Number.isInteger(row.retryCount) || row.retryCount < 0 ||
      (row.schemaVersion !== undefined && row.schemaVersion !== 1)) {
    throw new Error('Pending changes have an unsupported format. Local data has been retained for recovery.');
  }
  return row;
};
const restoreUndefined = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  if (!Array.isArray(value) && Object.keys(value).length === 1 && '__expense_manager_undefined__' in value) return undefined;
  for (const key of Object.keys(value)) (value as Record<string, unknown>)[key] = restoreUndefined((value as Record<string, unknown>)[key]);
  return value;
};
const refresh = async (broadcast = false): Promise<void> => {
  const generation = ++refreshGeneration;
  const rows = (await readOutbox()).map(validate);
  if (generation !== refreshGeneration) return;
  const previous = new Map(snapshot.map((row) => [row.id, row]));
  const incoming = new Set(rows.map((row) => row.id));
  const entities = new Set<QueuedOperation['entity']>();
  for (const row of snapshot) if (!incoming.has(row.id)) entities.add(row.entity);
  for (const row of rows) {
    const before = previous.get(row.id);
    if (!before || before.status !== row.status || !dataEqual(before.payload, row.payload)) entities.add(row.entity);
  }
  snapshot = rows;
  notify(broadcast, [...entities]);
};
let refreshRequested = false;
let scheduledRefresh: Promise<void> | undefined;
const requestRefresh = (): Promise<void> => {
  refreshRequested = true;
  if (scheduledRefresh) return scheduledRefresh;
  scheduledRefresh = new Promise<void>((resolve) => setTimeout(resolve, 25)).then(async () => {
    while (refreshRequested) { refreshRequested = false; await refresh(); }
  }).catch((error) => console.error('Saved changes could not refresh their local view:', error))
    .finally(() => { scheduledRefresh = undefined; });
  return scheduledRefresh;
};
const changed = async <T>(change: (rows: QueuedOperation[]) => { rows: QueuedOperation[]; result: T }): Promise<T> => {
  await offlineQueue.initialize();
  const committed = await changeOutbox((rows) => {
    const next = change(rows);
    const before = new Map(rows.map((row) => [row.id, row]));
    const nextIds = new Set(next.rows.map((row) => row.id));
    const entities = new Set<QueuedOperation['entity']>();
    rows.forEach((row) => { if (!nextIds.has(row.id)) entities.add(row.entity); });
    next.rows.forEach((row) => { if (before.get(row.id) !== row) entities.add(row.entity); });
    return { rows: next.rows, result: { ...next, entities: [...entities] } };
  });
  // A committed write remains accepted even if a subsequent cache read fails.
  ++refreshGeneration;
  snapshot = [...committed.rows].sort((a, b) => (a.sequence ?? a.timestamp) - (b.sequence ?? b.timestamp) || a.id.localeCompare(b.id));
  notify(true, committed.entities);
  void requestRefresh();
  return committed.result;
};
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  void requestRefresh().then(() => {
    const message = event.data as { type?: string; operations?: QueuedOperation[] } | null;
    if (message?.type === 'completed' && Array.isArray(message.operations)) notifyCompleted(message.operations, false);
  }).catch(console.error);
});
if (typeof window !== 'undefined') window.addEventListener('focus', () => { void requestRefresh(); });

export const offlineQueue = {
  get revision(): number { return revision; },
  expenseRevision(userId: string): number { return expenseVersions.get(userId) ?? 0; },
  initialize(): Promise<void> {
    if (!initialization) {
      initialization = (async () => {
        await migrateLegacyOutbox((data) => {
          if (!Array.isArray(data)) throw new Error('Pending changes are damaged; the legacy queue has been retained');
          return data.map((value) => {
            const row = validate(restoreUndefined(value));
            const payload = row.payload as Record<string, unknown> | null;
            if (row.type === 'create' && payload && typeof payload.userId === 'string' && typeof payload.id !== 'string') {
              return { ...row, payload: { ...payload, id: crypto.randomUUID() }, status: 'needs-attention', legacyAmbiguous: true, lastError: 'Legacy operation has no stable record ID. Check cloud records before retrying.' };
            }
            return row;
          });
        });
        await refresh();
      })();
      initialization.catch(() => { initialization = undefined; });
    }
    return initialization;
  },
  refresh,
  notifyCompleted,
  getAll(): QueuedOperation[] { return snapshot.map((row) => ({ ...row })); },
  count(userId?: string): number { return userId ? snapshot.filter((row) => ownerOf(row) === userId).length : snapshot.length; },
  async enqueue(operation: Mutation): Promise<string | null> {
    return (await this.enqueueMany([operation]))?.[0] ?? null;
  },
  async enqueueMany(operations: Mutation[]): Promise<string[] | null> {
    try {
      return await changed((rows) => {
        let sequence = rows.reduce((maximum, row) => Math.max(maximum, row.sequence ?? row.timestamp), Date.now());
        const additions = operations.map((operation): QueuedOperation => {
          if (typeof ownerOf(operation) !== 'string') throw new Error('Pending change requires its owner');
          const cached = sessionCache.get<unknown>(cacheEntityFor(operation.entity), String(ownerOf(operation)));
          const identity = (operation.payload as { id?: unknown })?.id;
          const previous = Array.isArray(cached) ? cached.find((row) => row?.id === identity) : cached;
          const dependencies = new Set(dependencyKeys(operation));
          if (previous && typeof previous === 'object') for (const key of dependencyKeys({ entity: operation.entity, payload: previous })) dependencies.add(key);
          const localSnapshot = previous && typeof previous === 'object' && (previous as { userId?: unknown }).userId === ownerOf(operation)
            ? previous as Record<string, unknown> : undefined;
          return validate({ ...operation, localSnapshot, dependencies: [...dependencies], id: `op-${crypto.randomUUID()}`, timestamp: Date.now(), sequence: ++sequence, retryCount: 0, schemaVersion: 1 });
        });
        return { rows: [...rows, ...additions], result: additions.map((row) => row.id) };
      });
    } catch (error) { console.error('Pending changes could not be saved', error); return null; }
  },
  hasPendingBudgetOperations(id: string, userId: string): boolean { return this.hasPending('budget', id, userId); },
  hasPendingExpenseOperations(id: string, userId: string): boolean { return this.hasPending('expense', id, userId); },
  hasPending(entity: string, id: string, userId: string): boolean {
    return snapshot.some((row) => row.entity === entity && ownerOf(row) === userId && (row.payload as { id?: unknown })?.id === id);
  },
  hasPendingExpenseDelete(id: string, userId: string): boolean {
    return snapshot.some((row) => row.entity === 'expense' && row.type === 'delete' && ownerOf(row) === userId && (row.payload as { id?: unknown })?.id === id);
  },
  async retry(id: string): Promise<boolean> {
    return changed((rows) => {
      const selected = (row: QueuedOperation) => row.id === id && !row.legacyAmbiguous && (!row.lease || row.lease.expiresAt <= Date.now());
      return { rows: rows.map((row) => selected(row) ? { ...row, retryCount: 0, status: undefined, nextAttemptAt: undefined, lease: undefined, lastError: undefined } : row), result: rows.some(selected) };
    });
  },
  /** Only the explicit duplicate-risk recovery dialog may call this API. */
  async recoverAmbiguous(id: string, userId: string, acknowledgment: { duplicateRiskAccepted: true }): Promise<boolean> {
    if (acknowledgment.duplicateRiskAccepted !== true) return false;
    return changed((rows) => {
      const selected = (row: QueuedOperation) => row.id === id && ownerOf(row) === userId && row.legacyAmbiguous === true && !row.lease;
      return { rows: rows.map((row) => selected(row) ? { ...row, legacyAmbiguous: false, status: undefined, retryCount: 0, nextAttemptAt: undefined, lastError: undefined } : row), result: rows.some(selected) };
    });
  },
  async retryExpenseOperationsForId(id: string, userId: string): Promise<boolean> {
    return changed((rows) => {
      const selected = (row: QueuedOperation) => row.entity === 'expense' && ownerOf(row) === userId && (row.payload as { id?: unknown })?.id === id && !row.legacyAmbiguous && (!row.lease || row.lease.expiresAt <= Date.now());
      return { rows: rows.map((row) => selected(row) ? { ...row, retryCount: 0, status: undefined, nextAttemptAt: undefined, lease: undefined, lastError: undefined } : row), result: rows.some(selected) };
    });
  },
  async clear(userId?: string): Promise<void> { await changed((rows) => ({ rows: userId ? rows.filter((row) => ownerOf(row) !== userId) : [], result: undefined })); },
  async discardUserPending(userId: string): Promise<void> {
    await changed((rows) => {
      if (rows.some((row) => ownerOf(row) === userId && row.lease)) throw Object.assign(new Error('A change is being processed or awaiting recovery. Finish synchronization before discarding pending changes.'), { code: 'active-operations' });
      return { rows: rows.filter((row) => ownerOf(row) !== userId), result: undefined };
    });
  },
  async claimNext(userId: string): Promise<QueuedOperation | null> {
    await this.initialize();
    const operation = await changeOutbox((rows) => {
      const ordered = [...rows].sort((a, b) => (a.sequence ?? a.timestamp) - (b.sequence ?? b.timestamp) || a.id.localeCompare(b.id));
      const now = Date.now();
      const next = ordered.find((row, index) => ownerOf(row) === userId && !row.legacyAmbiguous && row.status !== 'needs-attention' &&
        (!row.nextAttemptAt || row.nextAttemptAt <= now) && (!row.lease || row.lease.expiresAt <= now) &&
        !ordered.slice(0, index).some((earlier) => ownerOf(earlier) === userId && operationsOverlap(earlier, row)));
      if (!next) return { rows, result: null as QueuedOperation | null };
      const claimed = { ...next, lease: { token: crypto.randomUUID(), expiresAt: now + LEASE_MS } };
      return { rows: rows.map((row) => row.id === next.id ? claimed : row), result: claimed };
    });
    if (operation) {
      snapshot = snapshot.map((row) => row.id === operation.id ? operation : row);
      notify(false, []);
      channel?.postMessage('lease');
    }
    return operation;
  },
  async renew(id: string, token: string): Promise<boolean> {
    const owned = await changeOutbox((rows) => ({
      rows: rows.map((row) => row.id === id && row.lease?.token === token ? { ...row, lease: { token, expiresAt: Date.now() + LEASE_MS } } : row),
      result: rows.some((row) => row.id === id && row.lease?.token === token),
    }));
    if (owned) channel?.postMessage('lease');
    return owned;
  },
  async complete(id: string, token: string): Promise<boolean> {
    const completed = await changed((rows) => {
      const owned = rows.some((row) => row.id === id && row.lease?.token === token);
      return { rows: owned ? rows.filter((row) => row.id !== id) : rows, result: owned };
    });
    return completed;
  },
  async release(id: string, token: string, delay = 0): Promise<void> {
    await changed((rows) => ({ rows: rows.map((row) => row.id === id && row.lease?.token === token
      ? { ...row, lease: undefined, nextAttemptAt: Date.now() + delay } : row), result: undefined }));
  },
  async fail(id: string, token: string, error: unknown, retryable: boolean): Promise<boolean | null> {
    return changed((rows) => {
      let retry: boolean | null = null;
      const nextRows = rows.map((row) => {
        if (row.id !== id || row.lease?.token !== token) return row;
        const retryCount = row.retryCount + 1;
        retry = retryable && retryCount < MAX_RETRY;
        return { ...row, retryCount, lease: undefined, status: retry ? undefined : 'needs-attention' as const,
          nextAttemptAt: retry ? Date.now() + Math.min(300_000, 2000 * 2 ** (retryCount - 1)) * (0.8 + Math.random() * 0.4) : undefined,
          lastError: error instanceof Error ? error.message.slice(0, 240) : 'Synchronization failed' };
      });
      return { rows: nextRows, result: retry };
    });
  },
  nextWakeAt(userId: string): number | undefined {
    const ordered = [...snapshot].sort((a, b) => (a.sequence ?? a.timestamp) - (b.sequence ?? b.timestamp) || a.id.localeCompare(b.id));
    const times = ordered.filter((row, index) => ownerOf(row) === userId && row.status !== 'needs-attention' &&
      !ordered.slice(0, index).some((earlier) => ownerOf(earlier) === userId && operationsOverlap(earlier, row)))
      .map((row) => Math.max(row.nextAttemptAt ?? 0, row.lease?.expiresAt ?? 0));
    return times.length ? Math.max(Date.now() + 250, Math.min(...times)) : undefined;
  },
  dependencyKeys,
};
