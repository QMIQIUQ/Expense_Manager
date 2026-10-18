import { dataEqual } from './dataEquality';

const ENTITIES = ['expenses', 'categories', 'budgets', 'recurring', 'incomes', 'cards', 'banks', 'ewallets',
  'repayments', 'transfers', 'scheduledPayments', 'scheduledPaymentRecords', 'quickExpensePresets',
  'friendPreferences', 'featureSettings', 'userSettings', 'dashboardLayout'] as const;
export type CacheableEntity = typeof ENTITIES[number];
export interface CacheMetadata { timestamp: number; userId: string }
export interface CacheSnapshot<T> extends CacheMetadata {
  schemaVersion: 2;
  entity: CacheableEntity;
  version: string;
  data: T;
  coverage?: string;
  rowCount?: number;
}
const SESSION = 'expense_snapshot_session_v2_';
const PERSIST = 'expense_snapshot_v2_';
const TTL = 24 * 60 * 60 * 1000;
const memory = new Map<string, CacheSnapshot<unknown>>();
const singleton = new Set<CacheableEntity>(['featureSettings', 'userSettings', 'dashboardLayout']);
const keyFor = (entity: CacheableEntity, userId: string) => entity + '_' + userId;
const notifySnapshot = (entity: CacheableEntity, userId: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('session-cache-updated', { detail: { entity, userId } }));
};
const validData = (entity: CacheableEntity, value: unknown) => singleton.has(entity)
  ? value !== null && typeof value === 'object' && !Array.isArray(value) : Array.isArray(value);

const readEnvelope = <T,>(raw: string | null, entity: CacheableEntity, userId: string): CacheSnapshot<T> | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as CacheSnapshot<T>;
    if (value.schemaVersion !== 2 || value.entity !== entity || value.userId !== userId ||
      typeof value.version !== 'string' || !Number.isFinite(value.timestamp) || Date.now() - value.timestamp >= TTL ||
      !validData(entity, value.data) || (Array.isArray(value.data) && value.rowCount !== value.data.length)) return null;
    return value;
  } catch { return null; }
};
const readLegacy = <T,>(entity: CacheableEntity, userId: string): CacheSnapshot<T> | null => {
  const suffix = keyFor(entity, userId);
  for (const [storage, prefix, metadataPrefix] of [
    [sessionStorage, 'expense_cache_', 'expense_cache_ts_'],
    [localStorage, 'expense_persist_', 'expense_persist_ts_'],
  ] as const) {
    try {
      const raw = storage.getItem(prefix + suffix);
      const metadata = storage.getItem(metadataPrefix + suffix);
      if (!raw || !metadata) continue;
      const data = JSON.parse(raw) as T;
      const meta = JSON.parse(metadata) as CacheMetadata;
      if (meta.userId !== userId || !Number.isFinite(meta.timestamp) || Date.now() - meta.timestamp >= TTL || !validData(entity, data)) continue;
      // Legacy data may be displayed, but has no trustworthy full-history coverage.
      return { schemaVersion: 2, entity, userId, version: 'legacy', timestamp: meta.timestamp, data,
        rowCount: Array.isArray(data) ? data.length : undefined };
    } catch { /* Try the other cache; the durable outbox is independent. */ }
  }
  return null;
};

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (!event.key?.startsWith(PERSIST)) return;
  const suffix = event.key.slice(PERSIST.length);
  memory.delete(suffix);
  try { sessionStorage.removeItem(SESSION + suffix); } catch { /* Optional read cache. */ }
  const entity = ENTITIES.find((name) => suffix.startsWith(name + '_'));
  if (entity) notifySnapshot(entity, suffix.slice(entity.length + 1));
});

export const sessionCache = {
  getSnapshot<T>(entity: CacheableEntity, userId: string): CacheSnapshot<T> | null {
    const key = keyFor(entity, userId);
    const hot = memory.get(key);
    if (hot && Date.now() - hot.timestamp < TTL) return hot as CacheSnapshot<T>;
    if (hot) memory.delete(key);
    const candidates: CacheSnapshot<T>[] = [];
    try {
      const session = readEnvelope<T>(sessionStorage.getItem(SESSION + key), entity, userId);
      if (session) candidates.push(session);
    } catch { /* Persistent cache may still be available. */ }
    try {
      const persistent = readEnvelope<T>(localStorage.getItem(PERSIST + key), entity, userId);
      if (persistent) candidates.push(persistent);
    } catch { /* Memory/session cache may still be available. */ }
    const snapshot = candidates.sort((left, right) => right.timestamp - left.timestamp)[0] ?? readLegacy<T>(entity, userId);
    if (snapshot) memory.set(key, snapshot);
    return snapshot ?? null;
  },

  /** Data, identity, version and completeness are one atomic storage value. */
  set<T>(entity: CacheableEntity, userId: string, data: T, options: { coverage?: string } = {}): void {
    if (!validData(entity, data)) return;
    const key = keyFor(entity, userId);
    const previous = this.getSnapshot<T>(entity, userId);
    const coverage = Object.prototype.hasOwnProperty.call(options, 'coverage') ? options.coverage : previous?.coverage;
    if (previous?.version !== 'legacy' && previous?.coverage === coverage && dataEqual(previous?.data, data)) return;
    const envelope: CacheSnapshot<T> = {
      schemaVersion: 2, entity, userId, version: crypto.randomUUID(),
      timestamp: Math.max(Date.now(), (previous?.timestamp ?? 0) + 1), data, coverage,
      rowCount: Array.isArray(data) ? data.length : undefined,
    };
    memory.set(key, envelope);
    let serialized: string;
    try { serialized = JSON.stringify(envelope); }
    catch (error) { console.error('Read snapshot could not serialize:', error); return; }
    try { sessionStorage.setItem(SESSION + key, serialized); }
    catch (error) { console.warn('Session snapshot could not persist; using its memory copy:', error); }
    try { localStorage.setItem(PERSIST + key, serialized); }
    catch (error) { console.warn('Persistent snapshot could not save; prior complete snapshots remain intact:', error); }
    notifySnapshot(entity, userId);
  },
  get<T>(entity: CacheableEntity, userId: string): T | null { return this.getSnapshot<T>(entity, userId)?.data ?? null; },
  getCoverage(entity: CacheableEntity, userId: string): string | undefined { return this.getSnapshot(entity, userId)?.coverage; },
  getMetadata(entity: CacheableEntity, userId: string): CacheMetadata | null {
    const snapshot = this.getSnapshot(entity, userId);
    return snapshot ? { userId: snapshot.userId, timestamp: snapshot.timestamp } : null;
  },
  has(entity: CacheableEntity, userId: string): boolean { return this.getSnapshot(entity, userId) !== null; },
  remove(entity: CacheableEntity, userId: string): void {
    const suffix = keyFor(entity, userId);
    memory.delete(suffix);
    for (const storage of [sessionStorage, localStorage]) {
      for (const prefix of [SESSION, PERSIST, 'expense_cache_', 'expense_cache_ts_', 'expense_persist_', 'expense_persist_ts_']) {
        try { storage.removeItem(prefix + suffix); } catch { /* Optional read cache. */ }
      }
    }
    notifySnapshot(entity, userId);
  },
  clearUser(userId: string): void { ENTITIES.forEach((entity) => this.remove(entity, userId)); },
  clearAll(): void {
    memory.clear();
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
        keys.forEach((key) => {
          if (key && [SESSION, PERSIST, 'expense_cache_', 'expense_cache_ts_', 'expense_persist_', 'expense_persist_ts_'].some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
        });
      } catch { /* Never clear the IndexedDB outbox when clearing read caches. */ }
    }
  },
  clearOldCaches(): void {
    for (const [key, snapshot] of memory) {
      if (Date.now() - snapshot.timestamp < 60 * 60 * 1000) continue;
      memory.delete(key);
      try { sessionStorage.removeItem(SESSION + key); } catch { /* Optional read cache. */ }
    }
  },
  getCacheSize(): number {
    let bytes = 0;
    try {
      for (let index = 0; index < sessionStorage.length; index++) {
        const key = sessionStorage.key(index);
        if (key && (key.startsWith(SESSION) || key.startsWith('expense_cache_'))) bytes += 2 * (key.length + (sessionStorage.getItem(key)?.length ?? 0));
      }
    } catch { /* Optional diagnostic. */ }
    return bytes;
  },
};
