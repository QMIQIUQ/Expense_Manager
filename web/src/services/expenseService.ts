import { hasFinancialReceipt, runFinancialTransaction, type FinancialOperation } from './financialMutation';
import { validateExpenseSplit } from '../utils/expenseSplitCalculator';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  orderBy,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Expense, Transfer } from '../types';
import { applyBalanceAdjustmentsInTransaction, bookedAccountMovements, prepareBalanceAdjustments } from './balanceService';
import {
  applyExpenseSummaryChange,
  friendSpendingSummaryStateRef,
  isFriendSpendingSummaryReady,
} from './friendSpendingSummaryService';

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

const validateExpenseTags = async (transaction: import('firebase/firestore').Transaction, expense: Expense, previous?: Expense): Promise<void> => {
  if (!Array.isArray(expense.tagIds ?? []) || (expense.tagIds?.length ?? 0) > 10 || new Set(expense.tagIds).size !== (expense.tagIds?.length ?? 0)) throw Object.assign(new Error('At most 10 unique tags are allowed'), { code: 'invalid-argument' });
  for (const id of expense.tagIds ?? []) {
    if (typeof id !== 'string' || !id || id.includes('/')) throw Object.assign(new Error('Invalid tag identity'), { code: 'invalid-argument' });
    const tag = await transaction.get(doc(db, 'expenseTags', id));
    if (!tag.exists() || tag.data().userId !== expense.userId || tag.data().archived && !previous?.tagIds?.includes(id)) throw Object.assign(new Error('Tag is unavailable'), { code: 'failed-precondition' });
  }
};

export const expenseService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new expense
  async create(
    expense: Omit<Expense, 'createdAt' | 'updatedAt'>,
    options: { updateAccountBalances?: boolean } = {},
    operation?: FinancialOperation,
  ): Promise<string> {
    if (await hasFinancialReceipt(operation)) return expense.id!;
    validateExpenseSplit(expense as Expense);
    const { id, ...expenseFields } = expense;
    const now = Timestamp.now();
    const dataToSave = removeUndefinedFields({
      ...expenseFields,
      createdAt: now,
      updatedAt: now,
    });
    delete dataToSave.splitPaidMinor; delete dataToSave.splitSettlement;
    const docRef = id
      ? doc(db, COLLECTION_NAME, id)
      : doc(collection(db, COLLECTION_NAME));
    const balanceAdjustments = options.updateAccountBalances
      ? await prepareBalanceAdjustments(expense.userId, [{
          type: 'expense',
          expense: { ...expense, bookedAccountMovements: undefined, id: docRef.id } as Expense,
          direction: -1,
        }])
      : [];
    dataToSave.bookedAccountMovements = bookedAccountMovements(balanceAdjustments);
    await runFinancialTransaction(db, operation, async (transaction) => {
      const [existingExpense, summaryState] = await Promise.all([
        transaction.get(docRef),
        transaction.get(friendSpendingSummaryStateRef(expense.userId)),
      ]);
      if (existingExpense.exists()) {
        if (existingExpense.data().userId !== expense.userId) {
          throw new Error('Expense ID is already owned by another user');
        }
        return;
      }
      await validateExpenseTags(transaction, expense as Expense);
      await applyBalanceAdjustmentsInTransaction(transaction, balanceAdjustments);
      if (isFriendSpendingSummaryReady(summaryState.data())) {
        applyExpenseSummaryChange(transaction, null, { ...expense, id: docRef.id } as Expense);
      }
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

  async getAllFromServer(userId: string): Promise<Expense[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocsFromServer(q);
    return querySnapshot.docs.map((expenseDoc) => ({
      id: expenseDoc.id,
      ...expenseDoc.data(),
      createdAt: expenseDoc.data().createdAt?.toDate(),
      updatedAt: expenseDoc.data().updatedAt?.toDate(),
    })) as Expense[];
  },

  // Update an expense
  async update(id: string, updates: Partial<Expense>, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    const dataToUpdate: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const [field, value] of Object.entries(updates)) {
      if (['id', 'userId', 'createdAt', 'updatedAt', 'splitPaidMinor', 'splitSettlement', 'bookedAccountMovements'].includes(field)) continue;
      dataToUpdate[field] = value === undefined ? deleteField() : value;
    }
    await runFinancialTransaction(db, operation, async (transaction) => {
      const expenseSnapshot = await transaction.get(docRef);
      if (!expenseSnapshot.exists()) throw new Error('Expense not found');
      const previousExpense = { id, ...expenseSnapshot.data() } as Expense;
      const summaryState = await transaction.get(friendSpendingSummaryStateRef(previousExpense.userId));
      const nextExpense = { ...previousExpense, ...updates, id, splitPaidMinor: previousExpense.splitPaidMinor, bookedAccountMovements: previousExpense.bookedAccountMovements } as Expense;
      validateExpenseSplit(nextExpense, previousExpense);
      await validateExpenseTags(transaction, nextExpense, previousExpense);
      if (updates.scheduledPaymentRecordId !== undefined && updates.scheduledPaymentRecordId !== previousExpense.scheduledPaymentRecordId) throw new Error('Payment expense link cannot be changed');
      const paymentRef = previousExpense.scheduledPaymentRecordId ? doc(db, 'scheduledPaymentRecords', previousExpense.scheduledPaymentRecordId) : undefined;
      const payment = paymentRef ? await transaction.get(paymentRef) : undefined;
      if (paymentRef && (!payment?.exists() || payment.data().generatedExpenseId !== id || payment.data().userId !== previousExpense.userId)) throw new Error('Invalid scheduled payment link');
      if (nextExpense.userId !== previousExpense.userId) {
        throw new Error('Expense owner cannot be changed');
      }
      const balanceAdjustments = await prepareBalanceAdjustments(previousExpense.userId, [
        { type: 'expense', expense: previousExpense, direction: 1 },
        { type: 'expense', expense: nextExpense, direction: -1 },
      ]);
      await applyBalanceAdjustmentsInTransaction(transaction, balanceAdjustments);
      if (isFriendSpendingSummaryReady(summaryState.data())) {
        applyExpenseSummaryChange(transaction, previousExpense, nextExpense);
      }
      dataToUpdate.bookedAccountMovements = bookedAccountMovements(balanceAdjustments, 1);
      transaction.update(docRef, dataToUpdate);
      if (paymentRef && payment?.exists()) transaction.set(paymentRef, removeUndefinedFields({
        ...payment.data(),
        actualAmount: nextExpense.amount, baseAmount: nextExpense.baseAmount,
        currency: nextExpense.currency, baseCurrency: nextExpense.baseCurrency,
        exchangeRate: nextExpense.exchangeRate, exchangeRateDate: nextExpense.exchangeRateDate,
        paidDate: nextExpense.date, paymentMethod: nextExpense.paymentMethod,
        bankId: nextExpense.bankId, cardId: nextExpense.cardId, paymentMethodName: nextExpense.paymentMethodName,
        note: nextExpense.notes, difference: nextExpense.amount - payment.data().expectedAmount, updatedAt: Timestamp.now(),
      }));
    });
  },

  // Delete an expense
  async delete(id: string, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    await runFinancialTransaction(db, operation, async (transaction) => {
      const expenseSnapshot = await transaction.get(docRef);
      if (!expenseSnapshot.exists()) {
        return;
      }
      const expense = { id, ...expenseSnapshot.data() } as Expense;
      if (Object.values(expense.splitPaidMinor ?? {}).some((paid) => paid > 0)) throw Object.assign(new Error('Reverse split repayments before deleting this expense'), { code: 'failed-precondition' });
      const summaryState = await transaction.get(friendSpendingSummaryStateRef(expense.userId));
      if (isFriendSpendingSummaryReady(summaryState.data())) {
        applyExpenseSummaryChange(transaction, expense, null);
      }
      transaction.delete(docRef);
    });
  },

  async deleteWithRelatedTransfers(id: string, userId: string, candidateTransferIds: string[] = [], operation?: FinancialOperation): Promise<Transfer[]> {
    if (await hasFinancialReceipt(operation)) return [];
    const expenseRef = doc(db, COLLECTION_NAME, id);
    const userTransfersQuery = query(
      collection(db, 'transfers'),
      where('userId', '==', userId),
      where('expenseId', '==', id),
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

    return runFinancialTransaction(db, operation, async (transaction) => {
      const [expenseSnapshot, summaryState] = await Promise.all([
        transaction.get(expenseRef),
        transaction.get(friendSpendingSummaryStateRef(userId)),
      ]);

      if (expenseSnapshot.exists()) {
        if (expenseSnapshot.data().userId !== userId) throw new Error('Expense is owned by another user');
      }

      const currentExpenseData = expenseSnapshot.exists() ? expenseSnapshot.data() : undefined;
      if (Object.values(currentExpenseData?.splitPaidMinor ?? {}).some((paid) => Number(paid) > 0)) throw Object.assign(new Error('Reverse split repayments before deleting this expense'), { code: 'failed-precondition' });
      const paymentRef = typeof currentExpenseData?.scheduledPaymentRecordId === 'string' ? doc(db, 'scheduledPaymentRecords', currentExpenseData.scheduledPaymentRecordId) : undefined;
      const payment = paymentRef ? await transaction.get(paymentRef) : undefined;
      if (payment?.exists() && (payment.data().generatedExpenseId !== id || payment.data().userId !== userId)) throw new Error('Invalid scheduled payment link');
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
      if (currentExpenseData && isFriendSpendingSummaryReady(summaryState.data())) {
        applyExpenseSummaryChange(transaction, { id, ...currentExpenseData } as Expense, null);
      }
      if (expenseSnapshot.exists()) transaction.delete(expenseRef);
      if (paymentRef && payment?.exists()) transaction.delete(paymentRef);
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
