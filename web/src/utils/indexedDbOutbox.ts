import type { QueuedOperation } from './offlineQueue';

const DATABASE = 'expense-manager-outbox';
const STORE = 'operations';
const LEGACY_KEY = 'offline_operations_queue';
let connection: Promise<IDBDatabase> | undefined;

const open = (): Promise<IDBDatabase> => {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    let blocked = false;
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser cannot persist pending changes (IndexedDB unavailable)'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.result.createObjectStore('metadata', { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Close older Expense Manager tabs and retry opening local storage')); };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) { database.close(); return; }
      database.onversionchange = () => { database.close(); connection = undefined; };
      resolve(database);
    };
  });
  connection.catch(() => { connection = undefined; });
  return connection;
};

export const readOutbox = async (): Promise<QueuedOperation[]> => {
  const database = await open();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => resolve((request.result as QueuedOperation[])
      .sort((a, b) => (a.sequence ?? a.timestamp) - (b.sequence ?? b.timestamp) || a.id.localeCompare(b.id)));
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
};

/** The callback is synchronous: IndexedDB must not auto-commit between requests. */
export const changeOutbox = async <T>(change: (rows: QueuedOperation[]) => { rows: QueuedOperation[]; result: T }): Promise<T> => {
  const database = await open();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const request = store.getAll();
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const previous = request.result as QueuedOperation[];
        const changed = change(previous);
        result = changed.result;
        const nextIds = new Set(changed.rows.map((row) => row.id));
        previous.forEach((row) => { if (!nextIds.has(row.id)) store.delete(row.id); });
        const oldById = new Map(previous.map((row) => [row.id, row]));
        changed.rows.forEach((row) => { if (oldById.get(row.id) !== row) store.put(row); });
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure ?? transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
};

/** Import once per legacy operation, including recovery after a crash before key removal. */
export const migrateLegacyOutbox = async (decode: (value: unknown) => QueuedOperation[]): Promise<void> => {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (raw === null) return;
  const legacy = decode(JSON.parse(raw)); // Leave the source untouched on invalid/corrupt data.
  const database = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORE, 'metadata'], 'readwrite');
    const store = transaction.objectStore(STORE);
    const metadata = transaction.objectStore('metadata');
    const existing = store.getAll();
    existing.onsuccess = () => {
    let sequence = (existing.result as QueuedOperation[]).reduce((maximum, row) => Math.max(maximum, row.sequence ?? row.timestamp), Date.now());
    for (const row of legacy) {
      const importedSequence = ++sequence;
      const marker = `legacy:${row.id}`;
      const imported = metadata.get(marker);
      imported.onsuccess = () => {
        if (imported.result) return;
        // put and receipt are committed together; a second tab cannot import twice.
        store.put({ ...row, sequence: importedSequence, schemaVersion: 1 });
        metadata.put({ id: marker });
      };
    }
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
  if (localStorage.getItem(LEGACY_KEY) === raw) localStorage.removeItem(LEGACY_KEY);
};
