import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, startAfter, where, serverTimestamp, type QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { PreparedReceiptContent, ReceiptAttachment, ReceiptAttachmentCreate } from '../types/receiptAttachment';
import type { LocalMutation } from '../utils/localFirstMutation';
import type { QueuedOperation } from '../utils/offlineQueue';
import { offlineQueue } from '../utils/offlineQueue';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { networkStatus } from '../utils/networkStatus';
import { cacheReceiptContent, readCachedReceiptContent } from '../utils/receiptContentCache';
import { validateReceiptContent } from '../utils/receiptAttachmentContent';
import { acceptLocalMutation } from './acceptLocalMutation';
import { hasFinancialReceipt, runFinancialTransaction } from './financialMutation';

const requireOwner = (userId: string) => { if (!userId || auth.currentUser?.uid !== userId) throw Object.assign(new Error('Receipt owner changed'), { code: 'unauthenticated' }); };
const pendingVersion = (userId: string, expenseId: string) => JSON.stringify(offlineQueue.getAll().filter((operation) => operation.entity === 'receiptAttachment' &&
  (operation.payload as ReceiptAttachment)?.userId === userId && (operation.payload as ReceiptAttachment)?.expenseId === expenseId).map((operation) => ({ id: operation.id, type: operation.type, status: operation.status, attachmentId: (operation.payload as ReceiptAttachment).id, archived: (operation.payload as ReceiptAttachment).archived })));
const requests = new Map<string, Promise<{ rows: ReceiptAttachment[]; complete: boolean }>>();
export const createReceiptAttachmentMutation = async (userId: string, expenseId: string, content: PreparedReceiptContent): Promise<LocalMutation> => {
  requireOwner(userId);
  const id = doc(collection(db, 'receiptAttachments')).id;
  const blob = await validateReceiptContent(content);
  await cacheReceiptContent(userId, id, content.sha256, blob);
  requireOwner(userId);
  return { entity: 'receiptAttachment', type: 'create', payload: { ...content, id, userId, expenseId, provider: 'firestore', archived: false } satisfies ReceiptAttachmentCreate };
};
export const addReceiptAttachment = async (userId: string, expenseId: string, content: PreparedReceiptContent): Promise<void> => {
  const mutation = await createReceiptAttachmentMutation(userId, expenseId, content);
  await acceptLocalMutation(mutation);
};
export const archiveReceiptAttachment = async (attachment: ReceiptAttachment, archived: boolean): Promise<void> => {
  requireOwner(attachment.userId);
  await acceptLocalMutation({ entity: 'receiptAttachment', type: 'update', payload: { id: attachment.id, userId: attachment.userId, expenseId: attachment.expenseId, archived } });
};
export const listReceiptAttachments = (userId: string, expenseId: string): Promise<{ rows: ReceiptAttachment[]; complete: boolean }> => {
  requireOwner(userId);
  const version = pendingVersion(userId, expenseId);
  const key = JSON.stringify([userId, expenseId, networkStatus.isOnline, version]);
  const existing = requests.get(key); if (existing) return existing;
  const request = (async () => {
    const cached = sessionCache.getSnapshot<ReceiptAttachment[]>('receiptAttachments', userId);
    if (!networkStatus.isOnline) return { rows: applyPendingOperations('receiptAttachments', userId, cached?.data ?? []).filter((row) => row.expenseId === expenseId), complete: cached?.coverage === `expense:${expenseId}` };
    const rows: ReceiptAttachment[] = []; let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      const result = await getDocsFromServer(query(collection(db, 'receiptAttachments'), where('userId', '==', userId), where('expenseId', '==', expenseId), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(100)));
      requireOwner(userId);
      rows.push(...result.docs.map((row) => ({ ...row.data(), id: row.id, createdAt: row.data().createdAt?.toDate?.(), updatedAt: row.data().updatedAt?.toDate?.() } as ReceiptAttachment)));
      if (result.size < 100) break; cursor = result.docs[result.docs.length - 1];
    }
    if (pendingVersion(userId, expenseId) !== version) throw Object.assign(new Error('Receipt metadata changed while reading'), { code: 'aborted' });
    const projected = applyPendingOperations('receiptAttachments', userId, rows).filter((row) => row.expenseId === expenseId);
    const baseline = sessionCache.get<ReceiptAttachment[]>('receiptAttachments', userId) ?? [];
    sessionCache.set('receiptAttachments', userId, [...baseline.filter((row) => row.expenseId !== expenseId), ...projected], { coverage: `expense:${expenseId}` });
    return { rows: projected, complete: true };
  })().finally(() => requests.delete(key));
  requests.set(key, request); return request;
};
export const loadReceiptContent = async (attachment: ReceiptAttachment): Promise<Blob> => {
  const { userId, id, sha256 } = attachment; requireOwner(userId);
  const pending = offlineQueue.getAll().find((operation) => operation.entity === 'receiptAttachment' && operation.type === 'create' && (operation.payload as ReceiptAttachmentCreate)?.id === id && (operation.payload as ReceiptAttachmentCreate).userId === userId);
  if (pending) { const blob = await validateReceiptContent(pending.payload as ReceiptAttachmentCreate); requireOwner(userId); return blob; }
  const cached = await readCachedReceiptContent(userId, id, sha256); requireOwner(userId);
  if (cached) return cached;
  if (!networkStatus.isOnline) throw new Error('Open this receipt once while online to make it available offline');
  const snapshot = await getDocFromServer(doc(db, 'receiptAttachmentContents', id)); requireOwner(userId);
  const content = snapshot.data() as ReceiptAttachmentCreate | undefined;
  if (!content || content.userId !== userId || content.expenseId !== attachment.expenseId || content.sha256 !== sha256) throw new Error('Receipt content is unavailable');
  const blob = await validateReceiptContent(content);
  await cacheReceiptContent(userId, id, sha256, blob); requireOwner(userId); return blob;
};

/** Immutable content, metadata and receipt are committed in one Firestore transaction. */
export const commitReceiptAttachmentMutation = async (operation: QueuedOperation): Promise<void> => {
  const payload = operation.payload as ReceiptAttachmentCreate;
  const { userId, id, expenseId } = payload;
  requireOwner(userId);
  if (!id || !expenseId || operation.type === 'delete') throw Object.assign(new Error('Invalid receipt identity'), { code: 'invalid-argument' });
  if (await hasFinancialReceipt({ userId, operationId: operation.id })) return;
  if (operation.type === 'create') await validateReceiptContent(payload);
  await runFinancialTransaction(db, { userId, operationId: operation.id }, async (transaction) => {
    const metadataRef = doc(db, 'receiptAttachments', id); const contentRef = doc(db, 'receiptAttachmentContents', id);
    const [metadata, content, expense] = await Promise.all([transaction.get(metadataRef), transaction.get(contentRef), transaction.get(doc(db, 'expenses', expenseId))]);
    if (!expense.exists() || expense.data().userId !== userId) throw Object.assign(new Error('The linked expense is missing or owned by another user'), { code: 'failed-precondition' });
    if (metadata.exists() && (metadata.data().userId !== userId || metadata.data().expenseId !== expenseId)) throw Object.assign(new Error('Receipt identity mismatch'), { code: 'permission-denied' });
    if (operation.type === 'create') {
      if (metadata.exists()) {
        if (metadata.data().sha256 !== payload.sha256 || !content.exists()) throw new Error('Receipt ID already exists with different content');
        return;
      }
      if (content.exists()) throw new Error('Receipt content exists without its metadata');
      const { contentBase64, id: ignoredId, ...fields } = payload; void ignoredId;
      transaction.set(contentRef, { userId, expenseId, contentBase64, sha256: payload.sha256, byteSize: payload.byteSize, contentType: payload.contentType });
      transaction.set(metadataRef, { ...fields, archived: false, provider: 'firestore', lastMutationId: operation.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      if (!metadata.exists() || typeof payload.archived !== 'boolean') throw Object.assign(new Error('Receipt metadata is unavailable'), { code: 'failed-precondition' });
      transaction.update(metadataRef, { archived: payload.archived, lastMutationId: operation.id, updatedAt: serverTimestamp() });
    }
  });
};
