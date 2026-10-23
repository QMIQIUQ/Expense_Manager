import 'fake-indexeddb/auto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../config/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-expense-manager', appId: 'demo-app' }, 'receipt-archive-reliability');
  const auth = getAuth(app); const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { db, auth, firebaseAppInstance: app, friendSpendingEnabled: false, usingFirebaseEmulators: true };
});
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { deleteApp } from 'firebase/app';
import { doc, getDocFromServer, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, firebaseAppInstance } from '../../config/firebase';
import { addReceiptAttachment, archiveReceiptAttachment, createReceiptAttachmentMutation, loadReceiptContent } from '../../services/receiptAttachmentService';
import { expenseService } from '../../services/expenseService';
import type { Expense } from '../../types';
import { acceptLocalMutationBatch } from '../../services/acceptLocalMutation';
import { commitQueuedEntity } from '../../services/queuedEntityMutation';
import { offlineQueue } from '../../utils/offlineQueue';
import { sessionCache } from '../../utils/sessionCache';
import * as receiptContent from '../../utils/receiptAttachmentContent';
import { MAX_RECEIPT_BYTES, receiptContentHash } from '../../utils/receiptAttachmentContent';
import type { PreparedReceiptContent, ReceiptAttachment, ReceiptAttachmentCreate } from '../../types/receiptAttachment';
let originalEmail: string; let uid: string; let expenseId: string; let saved: ReceiptAttachmentCreate; let originalOperation: ReturnType<typeof offlineQueue.getAll>[number];
const content = async (size = 40): Promise<PreparedReceiptContent> => {
  const bytes = new Uint8Array(size); bytes.fill(32); bytes.set(new TextEncoder().encode('%PDF-1.7'));
  return { name: 'receipt.pdf', originalName: 'receipt.pdf', contentType: 'application/pdf', byteSize: bytes.length, originalByteSize: bytes.length, optimized: false, sha256: await receiptContentHash(bytes), contentBase64: Buffer.from(bytes).toString('base64') };
};
beforeAll(async () => {
  originalEmail = `archive-${Date.now()}@example.test`;
  uid = (await createUserWithEmailAndPassword(auth, originalEmail, 'Synthetic-fixture-123!')).user.uid;
  expenseId = `${uid}-expense`;
  await setDoc(doc(db, 'expenses', expenseId), { userId: uid, description: 'Receipt expense', amount: 10, date: '2026-10-23', paymentMethod: 'cash' });
});
beforeEach(async () => { await offlineQueue.clear(); });
afterAll(async () => { await offlineQueue.clear(); await deleteApp(firebaseAppInstance!); });
describe('permanent receipt archive', () => {
  it('persists stable owner/id/content before acceptance and atomically commits metadata/content/receipt', async () => {
    const prepared = await content();
    await addReceiptAttachment(uid, expenseId, prepared);
    originalOperation = offlineQueue.getAll()[0]; saved = originalOperation.payload as ReceiptAttachmentCreate;
    expect(saved).toMatchObject({ userId: uid, expenseId, contentBase64: prepared.contentBase64 }); expect(saved.id).toBeTruthy();
    const projected = sessionCache.get<ReceiptAttachment[]>('receiptAttachments', uid)!;
    expect(projected[0]).not.toHaveProperty('contentBase64');
    expect((await loadReceiptContent(saved)).size).toBe(prepared.byteSize);
    await commitQueuedEntity(originalOperation); await commitQueuedEntity(originalOperation);
    const metadata = (await getDocFromServer(doc(db, 'receiptAttachments', saved.id))).data()!;
    const bytes = (await getDocFromServer(doc(db, 'receiptAttachmentContents', saved.id))).data()!;
    expect(metadata.sha256).toBe(prepared.sha256); expect(metadata).not.toHaveProperty('contentBase64');
    expect(bytes.contentBase64).toBe(prepared.contentBase64);
    expect((await getDocFromServer(doc(db, 'mutationReceipts', uid, 'operations', originalOperation.id))).exists()).toBe(true);
    expect((await getDocFromServer(doc(db, 'expenses', expenseId))).data()).not.toHaveProperty('contentBase64');
  });
  it('archives/restores metadata without overwriting immutable content or letting old create replay restore it', async () => {
    await archiveReceiptAttachment(saved, true); const archive = offlineQueue.getAll()[0];
    await commitQueuedEntity(archive); await commitQueuedEntity(originalOperation);
    expect((await getDocFromServer(doc(db, 'receiptAttachments', saved.id))).data()!.archived).toBe(true);
    await expect(setDoc(doc(db, 'receiptAttachmentContents', saved.id), { contentBase64: 'forged' }, { merge: true })).rejects.toThrow();
    await expect(setDoc(doc(db, 'receiptAttachments', saved.id), { sha256: 'a'.repeat(64) }, { merge: true })).rejects.toThrow();
    await expect(deleteDoc(doc(db, 'receiptAttachmentContents', saved.id))).rejects.toThrow();
    await commitQueuedEntity({ ...archive, id: 'receipt-restore', payload: { ...saved, archived: false }, type: 'update' });
    expect((await getDocFromServer(doc(db, 'receiptAttachments', saved.id))).data()!.archived).toBe(false);
  });
  it('keeps a permanent remote failure pending and commits none of its domain documents or receipt', async () => {
    await addReceiptAttachment(uid, 'missing-expense', await content());
    const queued = offlineQueue.getAll()[0]; const payload = queued.payload as ReceiptAttachmentCreate;
    await expect(commitQueuedEntity(queued)).rejects.toThrow('linked expense');
    expect(offlineQueue.getAll().some((row) => row.id === queued.id)).toBe(true);
    expect((await getDocFromServer(doc(db, 'receiptAttachments', payload.id))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'receiptAttachmentContents', payload.id))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'mutationReceipts', uid, 'operations', queued.id))).exists()).toBe(false);
    expect((await loadReceiptContent(payload)).size).toBe(payload.byteSize);
  });
  it('durably accepts a new expense and receipt together and synchronizes in dependency order', async () => {
    const id = `${uid}-new-with-receipt`;
    const attachment = await createReceiptAttachmentMutation(uid, id, await content());
    await acceptLocalMutationBatch([
      { entity: 'expense', type: 'create', payload: { id, userId: uid, description: 'New receipt expense', amount: 10, date: '2026-10-23', paymentMethod: 'cash', category: 'other' } },
      attachment,
    ]);
    const operations = offlineQueue.getAll();
    expect(operations).toHaveLength(2);
    expect(operations.map((row) => row.entity)).toEqual(['expense', 'receiptAttachment']);
    expect(operations.every((row) => (row.payload as { userId: string }).userId === uid)).toBe(true);
    await expenseService.create(operations[0].payload as Expense, { updateAccountBalances: true }, { userId: uid, operationId: operations[0].id }); await commitQueuedEntity(operations[1]);
    const receiptId = (attachment.payload as ReceiptAttachmentCreate).id;
    expect((await getDocFromServer(doc(db, 'expenses', id))).exists()).toBe(true);
    expect((await getDocFromServer(doc(db, 'receiptAttachmentContents', receiptId))).exists()).toBe(true);
  });
  it('does not claim acceptance on outbox persistence failure', async () => {
    const enqueue = vi.spyOn(offlineQueue, 'enqueueMany').mockResolvedValueOnce(null);
    try { await expect(addReceiptAttachment(uid, expenseId, await content())).rejects.toThrow('Unable to save'); }
    finally { enqueue.mockRestore(); }
    expect(offlineQueue.getAll()).toHaveLength(0);
  });
  it('accepts exactly 600 KiB below the document limit and rejects oversize or corrupt content', async () => {
    await addReceiptAttachment(uid, expenseId, await content(MAX_RECEIPT_BYTES));
    const queued = offlineQueue.getAll()[0]; await commitQueuedEntity(queued);
    expect((await getDocFromServer(doc(db, 'receiptAttachmentContents', (queued.payload as ReceiptAttachmentCreate).id))).data()!.byteSize).toBe(MAX_RECEIPT_BYTES);
    await expect(addReceiptAttachment(uid, expenseId, await content(MAX_RECEIPT_BYTES + 1))).rejects.toThrow('600 KiB');
    await expect(addReceiptAttachment(uid, expenseId, { ...await content(), sha256: '0'.repeat(64) })).rejects.toThrow('checksum');
  });
  it('fences a user switch while pending receipt content is being validated', async () => {
    await addReceiptAttachment(uid, expenseId, await content());
    const payload = offlineQueue.getAll()[0].payload as ReceiptAttachmentCreate;
    let release!: (blob: Blob) => void;
    const delayed = new Promise<Blob>((resolve) => { release = resolve; });
    const validation = vi.spyOn(receiptContent, 'validateReceiptContent').mockReturnValueOnce(delayed);
    const reading = loadReceiptContent(payload);
    const rejected = expect(reading).rejects.toThrow('owner changed');
    try {
      await createUserWithEmailAndPassword(auth, `archive-switch-${Date.now()}@example.test`, 'Synthetic-fixture-123!');
      release(new Blob(['synthetic'])); await rejected;
    } finally {
      validation.mockRestore();
      await signInWithEmailAndPassword(auth, originalEmail, 'Synthetic-fixture-123!');
    }
  });
  it('rejects a different owner before exposing even locally cached bytes', async () => {
    await createUserWithEmailAndPassword(auth, `archive-other-${Date.now()}@example.test`, 'Synthetic-fixture-123!');
    await expect(loadReceiptContent(saved)).rejects.toThrow('owner changed');
    await expect(getDocFromServer(doc(db, 'receiptAttachments', saved.id))).rejects.toThrow();
    await expect(getDocFromServer(doc(db, 'receiptAttachmentContents', saved.id))).rejects.toThrow();
    await expect(commitQueuedEntity(originalOperation)).rejects.toThrow('owner changed');
  });
});
