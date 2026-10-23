import { doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { QueuedOperation } from '../utils/offlineQueue';
import { runFinancialTransaction } from './financialMutation';

/** A name reservation is committed with the tag and receipt, including across tabs. */
export const commitTagMutation = async (operation: QueuedOperation): Promise<void> => {
  const payload = operation.payload as Record<string, unknown>;
  if (typeof payload.userId !== 'string' || typeof payload.id !== 'string' || operation.type === 'delete') throw Object.assign(new Error('Invalid tag operation'), { code: 'invalid-argument' });
  const userId = payload.userId;
  const reference = doc(db, 'expenseTags', payload.id);
  await runFinancialTransaction(db, { userId, operationId: operation.id }, async (transaction) => {
    const current = await transaction.get(reference);
    if (current.exists() && current.data().userId !== userId) throw Object.assign(new Error('Tag owner mismatch'), { code: 'permission-denied' });
    if (operation.type === 'create' && current.exists()) return;
    if (operation.type === 'update' && !current.exists()) throw Object.assign(new Error('Tag no longer exists'), { code: 'failed-precondition' });
    const next = { ...current.data(), ...payload };
    const displayName = typeof next.name === 'string' ? next.name.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
    const name = displayName.toLowerCase();
    if (!name || name.includes('/') || name.length > 40 || !/^#[0-9a-f]{6}$/i.test(String(next.color)) || typeof next.archived !== 'boolean') throw Object.assign(new Error('Invalid tag'), { code: 'invalid-argument' });
    const nameRef = doc(db, 'expenseTagNames', `${userId}:${name}`);
    const oldName = current.data()?.normalizedName as string | undefined;
    const oldRef = oldName ? doc(db, 'expenseTagNames', `${userId}:${oldName}`) : undefined;
    const [reserved, oldReserved] = await Promise.all([transaction.get(nameRef), oldRef ? transaction.get(oldRef) : undefined]);
    if (!next.archived && reserved.exists() && reserved.data().tagId !== payload.id) throw Object.assign(new Error('Tag name already exists'), { code: 'failed-precondition' });
    if (oldRef && oldReserved?.exists() && oldReserved.data().tagId === payload.id && (oldName !== name || next.archived)) transaction.delete(oldRef);
    if (!next.archived) transaction.set(nameRef, { userId, tagId: payload.id, normalizedName: name });
    const now = Timestamp.now();
    const fields = { ...next }; delete fields.id;
    transaction.set(reference, { ...fields, name: displayName, normalizedName: name, createdAt: current.data()?.createdAt ?? now, updatedAt: now });
  });
};
