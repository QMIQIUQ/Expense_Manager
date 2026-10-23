import { hasFinancialReceipt, runFinancialTransaction, type FinancialOperation } from './financialMutation';
import {
  collection,
  deleteField,
  doc,
  getDocs,
  getDocFromServer,
  query,
  Timestamp,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Income } from '../types';
import { applyBalanceAdjustmentsInTransaction, bookedAccountMovements, prepareBalanceAdjustments } from './balanceService';

const COLLECTION_NAME = 'incomes';
const BALANCE_FIELDS = ['userId', 'paymentMethod', 'paymentMethodName', 'bankId', 'amount', 'currency', 'baseAmount', 'baseCurrency', 'date'];

const sameBalanceFields = (left: Record<string, unknown>, right: Record<string, unknown>) =>
  BALANCE_FIELDS.every((field) => JSON.stringify(left[field] ?? null) === JSON.stringify(right[field] ?? null));

export const incomeService = {
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create is idempotent when the caller supplies the stable ID used by the local view/offline queue.
  async create(income: Omit<Income, 'createdAt' | 'updatedAt'> & { id?: string }, operation?: FinancialOperation): Promise<string> {
    if (await hasFinancialReceipt(operation)) return income.id!;
    const { id, ...incomeData } = income;
    const incomeRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    const adjustments = await prepareBalanceAdjustments(income.userId, [{ type: 'income', income: { ...income, id: incomeRef.id, bookedAccountMovements: undefined } as Income, direction: 1 }]);
    const now = Timestamp.now();

    await runFinancialTransaction(db, operation, async (transaction) => {
      const existing = await transaction.get(incomeRef);
      if (existing.exists()) {
        if (existing.data().userId !== income.userId) throw new Error('Income ID is already owned by another user');
        return;
      }
      await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
      transaction.set(incomeRef, { ...incomeData, bookedAccountMovements: bookedAccountMovements(adjustments), userId: income.userId, createdAt: now, updatedAt: now });
    });
    return incomeRef.id;
  },

  async getAll(userId: string): Promise<Income[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      updatedAt: snapshot.data().updatedAt?.toDate(),
    })) as Income[];
  },

  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<Income[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      updatedAt: snapshot.data().updatedAt?.toDate(),
    })) as Income[];
  },

  async getByExpenseId(userId: string, expenseId: string): Promise<Income[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('linkedExpenseId', '==', expenseId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      updatedAt: snapshot.data().updatedAt?.toDate(),
    })) as Income[];
  },

  async update(id: string, updates: Partial<Income>, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const incomeRef = doc(db, COLLECTION_NAME, id);
    const before = await getDocFromServer(incomeRef);
    if (!before.exists()) throw new Error('Income not found');
    const previousIncome = { id, ...before.data() } as Income;
    if (updates.userId && updates.userId !== previousIncome.userId) throw new Error('Income owner cannot be changed');
    const nextIncome = { ...previousIncome, ...updates, id, bookedAccountMovements: previousIncome.bookedAccountMovements } as Income;
    const adjustments = await prepareBalanceAdjustments(previousIncome.userId, [
      { type: 'income', income: previousIncome, direction: -1 },
      { type: 'income', income: nextIncome, direction: 1 },
    ]);
    const cleanedUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
      cleanedUpdates[key] = value === undefined ? deleteField() : value;
    });

    await runFinancialTransaction(db, operation, async (transaction) => {
      const current = await transaction.get(incomeRef);
      if (!current.exists()) throw new Error('Income not found');
      if (current.data().userId !== previousIncome.userId) throw new Error('Income owner cannot be changed');
      if (!sameBalanceFields(current.data(), before.data())) throw new Error('Income changed while preparing balance update. Please retry.');
      await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
      transaction.update(incomeRef, { ...cleanedUpdates, bookedAccountMovements: bookedAccountMovements(adjustments, 1), updatedAt: Timestamp.now() });
    });
  },

  async delete(id: string, expectedUserId?: string, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const incomeRef = doc(db, COLLECTION_NAME, id);
    const before = await getDocFromServer(incomeRef);
    if (!before.exists()) return;
    const income = { id, ...before.data() } as Income;
    if (expectedUserId && income.userId !== expectedUserId) throw new Error('Income is owned by another user');
    const adjustments = await prepareBalanceAdjustments(income.userId, [{ type: 'income', income, direction: -1 }]);

    await runFinancialTransaction(db, operation, async (transaction) => {
      const current = await transaction.get(incomeRef);
      if (!current.exists()) return;
      if (current.data().userId !== income.userId) throw new Error('Income is owned by another user');
      if (!sameBalanceFields(current.data(), before.data())) throw new Error('Income changed while preparing deletion. Please retry.');
      await applyBalanceAdjustmentsInTransaction(transaction, adjustments);
      transaction.delete(incomeRef);
    });
  },
};
