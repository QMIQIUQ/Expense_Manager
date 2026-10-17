import {
  collection,
  runTransaction,
  updateDoc,
  doc,
  getDocFromServer,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transfer } from '../types';
import { applyBalanceAdjustmentsInTransaction, prepareBalanceAdjustments } from './balanceService';

const COLLECTION_NAME = 'transfers';

// Helper function to remove undefined values from an object (Firebase doesn't accept undefined)
const cleanUndefinedValues = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

export const transferService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new transfer
  async create(transfer: Omit<Transfer, 'createdAt' | 'updatedAt'>): Promise<string> {
    const { id, ...transferFields } = transfer;
    const now = Timestamp.now();
    const cleanedTransfer = cleanUndefinedValues(transferFields);
    const docRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    const balanceAdjustments = await prepareBalanceAdjustments(transfer.userId, [{
      type: 'transfer',
      transfer: { ...transfer, id: docRef.id } as Transfer,
      sourceDirection: -1,
      destinationDirection: 1,
    }]);

    await runTransaction(db, async (transaction) => {
      const expenseRef = transfer.expenseId ? doc(db, 'expenses', transfer.expenseId) : null;
      const [existingTransfer, linkedExpense] = await Promise.all([
        transaction.get(docRef),
        expenseRef ? transaction.get(expenseRef) : Promise.resolve(null),
      ]);

      if (expenseRef && (!linkedExpense?.exists() || linkedExpense.data().userId !== transfer.userId)) {
        throw new Error('Cannot create a transfer for a missing or unrelated expense');
      }
      if (existingTransfer.exists()) {
        if (existingTransfer.data().userId !== transfer.userId) {
          throw new Error('Transfer ID is already owned by another user');
        }
        if (existingTransfer.data().expenseId !== transfer.expenseId) {
          throw new Error('Transfer ID is already linked to another expense');
        }
        if (expenseRef && linkedExpense?.exists()) {
          const relatedTransferIds = Array.isArray(linkedExpense.data().relatedTransferIds)
            ? linkedExpense.data().relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
            : [];
          if (!relatedTransferIds.includes(docRef.id)) {
            transaction.update(expenseRef, { relatedTransferIds: [...relatedTransferIds, docRef.id], updatedAt: now });
          }
        }
        return;
      }
      await applyBalanceAdjustmentsInTransaction(transaction, balanceAdjustments);
      transaction.set(docRef, {
        ...cleanedTransfer,
        userId: transfer.userId,
        createdAt: now,
        updatedAt: now,
      });
      if (expenseRef && linkedExpense?.exists()) {
        const relatedTransferIds = Array.isArray(linkedExpense.data().relatedTransferIds)
          ? linkedExpense.data().relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
          : [];
        if (!relatedTransferIds.includes(docRef.id)) {
          transaction.update(expenseRef, { relatedTransferIds: [...relatedTransferIds, docRef.id], updatedAt: now });
        }
      }
    });
    return docRef.id;
  },

  async deleteWithBalanceReversal(id: string, expectedUserId?: string): Promise<void> {
    const transferRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDocFromServer(transferRef);
    if (!snapshot.exists()) return;
    const transfer = { id, ...snapshot.data() } as Transfer;
    if (expectedUserId && transfer.userId !== expectedUserId) throw new Error('Transfer is owned by another user');
    const adjustments = await prepareBalanceAdjustments(transfer.userId, [{
      type: 'transfer',
      transfer,
      sourceDirection: 1,
      destinationDirection: -1,
    }]);

    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(transferRef);
      if (!current.exists()) return;
      if (current.data().userId !== transfer.userId) throw new Error('Transfer is owned by another user');
      const balanceFields = ['userId', 'date', 'fromPaymentMethod', 'fromPaymentMethodName', 'fromBankId', 'toPaymentMethod', 'toPaymentMethodName', 'toBankId', 'amount', 'currency', 'baseAmount', 'baseCurrency', 'toAmount', 'toCurrency', 'toBaseAmount'];
      if (balanceFields.some((field) => JSON.stringify(current.data()[field] ?? null) !== JSON.stringify((transfer as unknown as Record<string, unknown>)[field] ?? null))) {
        throw new Error('Transfer changed while preparing deletion. Please retry.');
      }
      await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
      transaction.delete(transferRef);
    });
  },

  // Get all transfers for a user
  async getAll(userId: string): Promise<Transfer[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Transfer[];
  },

  // Update a transfer
  async update(id: string, updates: Partial<Transfer>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete a transfer
  async delete(id: string, expectedUserId?: string): Promise<void> {
    await this.deleteWithBalanceReversal(id, expectedUserId);
  },

  // Get transfers by date range
  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<Transfer[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Transfer[];
  },
};
