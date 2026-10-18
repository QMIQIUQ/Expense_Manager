import { auth, db, usingFirebaseEmulators } from '../config/firebase';
import type { HistoryCollection, HistoryCursor, HistoryPage, HistoryRange } from './historyService';
interface WireValue { nullValue?: unknown; stringValue?: string; integerValue?: string; doubleValue?: number | string; booleanValue?: boolean; timestampValue?: string; arrayValue?: { values?: WireValue[] }; mapValue?: { fields?: Record<string, WireValue> }; referenceValue?: string }
const decode = (value: WireValue): unknown => {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, field]) => [key, decode(field)]));
  return value.referenceValue;
};
/** All pages of an exact traversal use the first response's read time.
 * https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery
 * Firebase user ID tokens retain Firestore Security Rules enforcement.
 */
export const getConsistentHistoryPage = async <T,>(name: HistoryCollection, userId: string, range?: HistoryRange,
  cursor?: HistoryCursor, readTime?: string): Promise<HistoryPage<T> & { readTime: string }> => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw Object.assign(new Error('History owner is no longer signed in'), { code: 'unauthenticated' });
  const project = db.app.options.projectId;
  if (!project) throw new Error('Firebase project is not configured');
  const parent = `projects/${project}/databases/(default)/documents`;
  const field = (path: string, op: string, value: string) => ({ fieldFilter: { field: { fieldPath: path }, op, value: { stringValue: value } } });
  const filters = [field('userId', 'EQUAL', userId), ...(range ? [field('date', 'GREATER_THAN_OR_EQUAL', range.startDate), field('date', 'LESS_THAN_OR_EQUAL', range.endDate)] : [])];
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== userId) throw Object.assign(new Error('History account changed'), { code: 'unauthenticated' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const host = usingFirebaseEmulators ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
    const response = await fetch(`${host}/v1/${parent}:runQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, signal: controller.signal,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: name }], where: { compositeFilter: { op: 'AND', filters } },
        orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
        limit: 100, ...(cursor ? { startAt: { before: false, values: [{ stringValue: cursor.date }, { referenceValue: `${parent}/${name}/${cursor.id}` }] } } : {}) },
        ...(readTime ? { readTime } : {}) }),
    });
    const wire = await response.json();
    if (!response.ok) throw Object.assign(new Error(wire.error?.message ?? 'History snapshot failed'), { code: String(wire.error?.status ?? 'unavailable').toLowerCase().replace(/_/g, '-') });
    const messages = wire as Array<{ document?: { name: string; fields: Record<string, WireValue> }; readTime?: string }>;
    const times = messages.map((row) => row.readTime).filter((value): value is string => !!value);
    const timestamp = readTime ?? times[times.length - 1];
    if (!timestamp) throw new Error('History response has no consistency timestamp');
    const rows = messages.flatMap((row) => row.document ? [{
      ...Object.fromEntries(Object.entries(row.document.fields).map(([key, value]) => [key, decode(value)])), id: row.document.name.substring(row.document.name.lastIndexOf('/') + 1),
    }] : []) as T[];
    const last = rows[rows.length - 1] as { id: string; date: string } | undefined;
    return { rows, hasMore: rows.length === 100, cursor: last ? { id: last.id, date: last.date } : undefined, readTime: timestamp, complete: true };
  } finally { clearTimeout(timeout); }
};
