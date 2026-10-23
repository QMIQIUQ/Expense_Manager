import { auth, db, usingFirebaseEmulators } from '../config/firebase';
import { decodeFirestoreValue } from './financialSnapshotService';

export type RestWrite = { update: { name: string; fields: Record<string, unknown> }; updateTransforms?: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }> };
export const encodeFirestoreValue = (value: unknown): unknown => {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') return { timestampValue: value.toDate().toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === 'object' && value) return { mapValue: { fields: encodeFirestoreFields(value as Record<string, unknown>) } };
  throw new Error('Unsupported financial transaction value');
};
export const encodeFirestoreFields = (value: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined).map(([key, field]) => [key, encodeFirestoreValue(field)]));
export interface RestTransaction {
  id: string; parent: string;
  get: (paths: string[]) => Promise<Array<Record<string, unknown> | undefined>>;
  query: (structuredQuery: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
}

/** Query predicates and domain writes share one serializable read/write transaction.
 * https://firebase.google.com/docs/firestore/transaction-data-contention
 * Uses the signed-in Firebase user's token, preserving Security Rules enforcement.
 */
export const runFirestoreReadWriteTransaction = async (userId: string, apply: (transaction: RestTransaction) => Promise<RestWrite[]>): Promise<void> => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw Object.assign(new Error('Transaction owner changed'), { code: 'unauthenticated' });
  const token = await user.getIdToken();
  const parent = `projects/${db.app.options.projectId}/databases/(default)/documents`;
  const host = usingFirebaseEmulators ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
  const request = async (method: string, payload: unknown): Promise<unknown> => {
    if (auth.currentUser?.uid !== userId) throw Object.assign(new Error('Transaction owner changed'), { code: 'unauthenticated' });
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${host}/v1/${parent}:${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.error?.message ?? 'Financial transaction failed'), { code: String(result.error?.status ?? 'unavailable').toLowerCase().replace(/_/g, '-') });
      return result;
    } finally { clearTimeout(timer); }
  };
  const { transaction: id } = await request('beginTransaction', { options: { readWrite: {} } }) as { transaction: string };
  let committed = false;
  const decodeDocument = (document: { name: string; fields: Record<string, Parameters<typeof decodeFirestoreValue>[0]> }): Record<string, unknown> => ({ ...Object.fromEntries(Object.entries(document.fields).map(([key, value]) => [key, decodeFirestoreValue(value)])), id: document.name.slice(document.name.lastIndexOf('/') + 1) });
  try {
    const writes = await apply({ id, parent,
      get: async (paths) => {
        const rows = await request('batchGet', { documents: paths.map((path) => `${parent}/${path}`), transaction: id }) as Array<{ found?: Parameters<typeof decodeDocument>[0] }>;
        const byName = new Map(rows.flatMap((row) => row.found ? [[row.found.name, decodeDocument(row.found)] as const] : []));
        return paths.map((path) => byName.get(`${parent}/${path}`));
      },
      query: async (structuredQuery) => {
        const rows = await request('runQuery', { structuredQuery, transaction: id }) as Array<{ document?: Parameters<typeof decodeDocument>[0] }>;
        return rows.flatMap((row) => row.document ? [decodeDocument(row.document)] : []);
      },
    });
    if (writes.length) { await request('commit', { transaction: id, writes }); committed = true; }
  } finally { if (!committed) await request('rollback', { transaction: id }).catch(() => undefined); }
};
