import {
  collection,
  runTransaction,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Expense, Transfer } from '../types';
import { applyBalanceAdjustmentsInTransaction, prepareBalanceAdjustments } from './balanceService';

// Helper to strip undefined fields so Firestore doesn't reject the payload
const removeUndefinedFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });
  return cleaned;
};

const COLLECTION_NAME = 'expenses';

export const expenseService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new expense
  async create(
    expense: Omit<Expense, 'createdAt' | 'updatedAt'>,
    options: { updateAccountBalances?: boolean } = {},
  ): Promise<string> {
    const { id, ...expenseFields } = expense;
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...expenseFields,
      createdAt: now,
      updatedAt: now,
    });
    const docRef = id
      ? doc(db, COLLECTION_NAME, id)
      : doc(collection(db, COLLECTION_NAME));
    const balanceAdjustments = options.updateAccountBalances
      ? await prepareBalanceAdjustments(expense.userId, [{
          type: 'expense',
          expense: { ...expense, id: docRef.id } as Expense,
          direction: -1,
        }])
      : [];
    await runTransaction(db, async (transaction) => {
      const existingExpense = await transaction.get(docRef);
      if (existingExpense.exists()) {
        if (existingExpense.data().userId !== expense.userId) {
          throw new Error('Expense ID is already owned by another user');
        }
        return;
      }
      await applyBalanceAdjustmentsInTransaction(transaction, balanceAdjustments);
      transaction.set(docRef, dataToSave);
    });
    return docRef.id;
  },

  // Get all expenses for a user
  async getAll(userId: string): Promise<Expense[]> {
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
    })) as Expense[];
  },

  // Update an expense
  async update(id: string, updates: Partial<Expense>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const dataToUpdate = removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    await updateDoc(docRef, dataToUpdate);
  },

  // Delete an expense
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  async deleteWithRelatedTransfers(id: string, userId: string, candidateTransferIds: string[] = []): Promise<Transfer[]> {
    const expenseRef = doc(db, COLLECTION_NAME, id);
    const userTransfersQuery = query(
      collection(db, 'transfers'),
      where('userId', '==', userId),
    );
    const [preflightExpense, preflightTransfers] = await Promise.all([
      getDoc(expenseRef),
      getDocs(userTransfersQuery),
    ]);
    if (preflightExpense.exists() && preflightExpense.data().userId !== userId) {
      throw new Error('Expense is owned by another user');
    }

    const toTransfer = (id: string, data: Record<string, unknown>): Transfer =>
      ({ id, ...data } as unknown as Transfer);
    const fingerprint = (data: Record<string, unknown> | undefined, fields: string[]): string | null =>
      data ? JSON.stringify(fields.map((field) => data[field] ?? null)) : null;
    const expenseBalanceFields = ['userId', 'date', 'paymentMethod', 'paymentMethodName', 'bankId', 'amount', 'currency', 'baseAmount', 'baseCurrency'];
    const transferBalanceFields = ['userId', 'expenseId', 'date', 'fromPaymentMethod', 'fromPaymentMethodName', 'fromBankId', 'toPaymentMethod', 'toPaymentMethodName', 'toBankId', 'amount', 'currency', 'baseAmount', 'baseCurrency', 'toAmount', 'toCurrency', 'toBaseAmount'];
    const preflightExpenseData = preflightExpense.exists() ? preflightExpense.data() : undefined;
    const preflightTransferIds = new Set<string>([
      ...(Array.isArray(preflightExpenseData?.relatedTransferIds)
        ? preflightExpenseData.relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
        : []),
      ...preflightTransfers.docs.filter((snapshot) => snapshot.data().expenseId === id).map((snapshot) => snapshot.id),
      ...candidateTransferIds.filter((transferId) => typeof transferId === 'string' && !transferId.startsWith('temp-')),
    ]);
    const preflightTransferSnapshots = await Promise.all(
      [...preflightTransferIds].map((transferId) => getDoc(doc(db, 'transfers', transferId)))
    );
    const preflightTransferData = new Map<string, Record<string, unknown>>();
    preflightTransferSnapshots.forEach((snapshot) => {
      if (snapshot.exists()) preflightTransferData.set(snapshot.id, snapshot.data());
    });
    const preflightLinkedTransfers = [...preflightTransferData.entries()]
      .filter(([, data]) => data.userId === userId && data.expenseId === id)
      .sort(([a], [b]) => a.localeCompare(b));
    const expenseBalanceAdjustments = preflightExpenseData
      ? await prepareBalanceAdjustments(userId, [{
          type: 'expense',
          expense: { id, ...preflightExpenseData } as Expense,
          direction: 1,
        }])
      : [];
    const transferBalanceAdjustments = new Map<string, Awaited<ReturnType<typeof prepareBalanceAdjustments>>>();
    await Promise.all(preflightLinkedTransfers.map(async ([transferId, data]) => {
      transferBalanceAdjustments.set(transferId, await prepareBalanceAdjustments(userId, [{
        type: 'transfer',
        transfer: toTransfer(transferId, data),
        sourceDirection: 1,
        destinationDirection: -1,
      }]));
    }));

    return runTransaction(db, async (transaction) => {
      const expenseSnapshot = await transaction.get(expenseRef);

      if (expenseSnapshot.exists()) {
        if (expenseSnapshot.data().userId !== userId) throw new Error('Expense is owned by another user');
      }

      const currentExpenseData = expenseSnapshot.exists() ? expenseSnapshot.data() : undefined;
      const currentTransferIds = new Set<string>([
        ...preflightTransferIds,
        ...(Array.isArray(currentExpenseData?.relatedTransferIds)
          ? currentExpenseData.relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
          : []),
      ]);
      const currentTransferSnapshots = await Promise.all(
        [...currentTransferIds].map((transferId) => transaction.get(doc(db, 'transfers', transferId)))
      );
      const currentLinkedTransfers: Array<{ id: string; ref: typeof expenseRef; data: Record<string, unknown> }> = [];
      currentTransferSnapshots.forEach((snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.userId === userId && data.expenseId === id) {
          currentLinkedTransfers.push({ id: snapshot.id, ref: snapshot.ref, data });
        }
      });
      currentLinkedTransfers.sort((a, b) => a.id.localeCompare(b.id));

      const balanceAdjustments = [];
      if (currentExpenseData) {
        if (!preflightExpenseData || fingerprint(preflightExpenseData, expenseBalanceFields) !== fingerprint(currentExpenseData, expenseBalanceFields)) {
          throw new Error('Expense changed while preparing deletion. Please retry.');
        }
        balanceAdjustments.push(...expenseBalanceAdjustments);
      }
      for (const snapshot of currentLinkedTransfers) {
        const previousData = preflightTransferData.get(snapshot.id);
        if (!previousData || fingerprint(previousData, transferBalanceFields) !== fingerprint(snapshot.data, transferBalanceFields)) {
          throw new Error('A linked transfer changed while preparing deletion. Please retry.');
        }
        balanceAdjustments.push(...(transferBalanceAdjustments.get(snapshot.id) || []));
      }

      // Revalidate the exact expense link inside the transaction. A stale UI ID
      // or a transfer relinked elsewhere must never delete an unrelated record.
      await applyBalanceAdjustmentsInTransaction(transaction, balanceAdjustments);
      if (expenseSnapshot.exists()) transaction.delete(expenseRef);
      const deletedTransfers = currentLinkedTransfers.map((snapshot) => toTransfer(snapshot.id, snapshot.data));
      currentLinkedTransfers.forEach((snapshot) => {
        if (snapshot.data.expenseId === id && snapshot.data.userId === userId) {
          transaction.delete(snapshot.ref);
        }
      });
      return deletedTransfers;
    });
  },

  // Get expenses by date range
  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<Expense[]> {
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
    })) as Expense[];
  },

  // Get expenses by category
  async getByCategory(userId: string, category: string): Promise<Expense[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Expense[];
  },
};
