import { hasFinancialReceipt, type FinancialOperation } from './financialMutation';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  Timestamp,
  getDocFromServer,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Budget, OverallBudgetLimits } from '../types';
import { type BudgetAllocationInput, validateBudgetAllocationChange } from '../utils/budgetAllocation';
import { runBudgetMutationTransaction } from '../utils/budgetMutationTransaction';
import { allocationLimitsForSettings } from '../utils/incomeLinkedBudget';

const COLLECTION_NAME = 'budgets';

// Helper function to remove undefined values from an object
// Firestore does not accept undefined values
// This function preserves all defined values and only removes keys with undefined values
const removeUndefinedValues = <T extends Record<string, unknown>>(obj: T): { [K in keyof T]: T[K] extends undefined ? never : T[K] } => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as { [K in keyof T]: T[K] extends undefined ? never : T[K] };
};

const prepareAllocationLimits = (
  budgets: Budget[],
  proposedBudget: BudgetAllocationInput,
  limits: OverallBudgetLimits | undefined,
  previousBudgetId?: string,
): { limits: OverallBudgetLimits; increases: Array<{ period: Budget['period']; amount: number }> } => {
  const updatedLimits: OverallBudgetLimits = { ...limits };
  const increases: Array<{ period: Budget['period']; amount: number }> = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const validation = validateBudgetAllocationChange(budgets, proposedBudget, updatedLimits, previousBudgetId);
    if (validation.valid) return { limits: updatedLimits, increases };
    if (
      validation.reason !== 'limit-below-allocation' ||
      !validation.period ||
      validation.allocatedMinorUnits === undefined ||
      updatedLimits[validation.period] === undefined
    ) throw new Error(validation.reason);

    const amount = validation.allocatedMinorUnits / 100;
    updatedLimits[validation.period] = amount;
    increases.push({ period: validation.period, amount });
  }

  const finalValidation = validateBudgetAllocationChange(budgets, proposedBudget, updatedLimits, previousBudgetId);
  if (!finalValidation.valid) throw new Error(finalValidation.reason);
  return { limits: updatedLimits, increases };
};

const notifyBudgetLimitIncreases = (
  userId: string,
  increases: Array<{ period: Budget['period']; amount: number }>,
) => {
  if (typeof window === 'undefined') return;
  for (const increase of increases) {
    window.dispatchEvent(new CustomEvent('budget-limit-auto-increased', {
      detail: { userId, ...increase },
    }));
  }
};

const buildDefaultUserSettings = (
  userId: string,
  overallBudgetLimits: OverallBudgetLimits,
  budgetAllocationRevision: number,
  now: ReturnType<typeof Timestamp.now>,
) => ({
  userId,
  billingCycleDay: 1,
  timeFormat: '24h',
  dateFormat: 'YYYY-MM-DD',
  useStepByStepForm: false,
  displayCurrency: 'MYR',
  budgetAllocationRevision,
  ...(Object.keys(overallBudgetLimits).length > 0 ? { overallBudgetLimits } : {}),
  createdAt: now,
  updatedAt: now,
});

export const budgetService = {
  // Generate the document ID before queueing so a retried create is idempotent.
  createId(): string {
    return doc(collection(db, COLLECTION_NAME)).id;
  },

  // Create a new budget
  async create(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, operation?: FinancialOperation): Promise<string> {
    if (await hasFinancialReceipt(operation)) return budget.id!;
    const { id, ...budgetData } = budget;
    const budgetRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    const increases = await runBudgetMutationTransaction(budget.userId, async (transaction, snapshot, settingsRef) => {
      const existingBudget = snapshot.budgets.find((entry) => entry.id === budgetRef.id);
      if (existingBudget) return [];

      const existingDocument = await transaction.get(budgetRef);
      if (existingDocument.exists()) {
        if (existingDocument.data().userId === budget.userId) return [];
        throw new Error('budget-id-conflict');
      }

      const allocation = prepareAllocationLimits(snapshot.budgets, budgetData, allocationLimitsForSettings(snapshot));
      const now = Timestamp.now();
      const cleanedBudget = removeUndefinedValues(budgetData as unknown as Record<string, unknown>);
      const nextRevision = snapshot.budgetAllocationRevision + 1;

      if (snapshot.hasSettingsDocument) {
        const settingsUpdate: Record<string, unknown> = {
          updatedAt: now,
          budgetAllocationRevision: nextRevision,
        };
        for (const increase of allocation.increases) {
          settingsUpdate[`overallBudgetLimits.${increase.period}`] = increase.amount;
        }
        transaction.update(settingsRef, settingsUpdate);
      } else {
        transaction.set(settingsRef, buildDefaultUserSettings(budget.userId, allocation.limits, nextRevision, now));
      }

      transaction.set(budgetRef, {
        ...cleanedBudget,
        createdAt: now,
        updatedAt: now,
      });
      return allocation.increases;
    }, operation);
    notifyBudgetLimitIncreases(budget.userId, increases);
    return budgetRef.id;
  },

  // Get all budgets for a user
  async getAll(userId: string, fromServer: boolean = false): Promise<Budget[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = fromServer ? await getDocsFromServer(q) : await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Budget[];
  },

  // Update a budget
  async update(id: string, updates: Partial<Budget>, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    const ownerSnapshot = await getDocFromServer(docRef);
    if (!ownerSnapshot.exists()) throw new Error('budget-not-found');
    const userId = ownerSnapshot.data().userId as string | undefined;
    if (!userId) throw new Error('budget-owner-missing');
    if (updates.userId && updates.userId !== userId) throw new Error('budget-owner-mismatch');

    const increases = await runBudgetMutationTransaction(userId, async (transaction, snapshot, settingsRef) => {
      const existingBudget = snapshot.budgets.find((budget) => budget.id === id);
      if (!existingBudget) throw new Error('budget-not-found');

      const proposedBudget = { ...existingBudget, ...updates, id } as Budget;
      const allocation = prepareAllocationLimits(snapshot.budgets, proposedBudget, allocationLimitsForSettings(snapshot), id);
      const now = Timestamp.now();
      const nextRevision = snapshot.budgetAllocationRevision + 1;
      const budgetUpdates = { ...updates };
      delete budgetUpdates.id;
      delete budgetUpdates.userId;
      delete budgetUpdates.createdAt;
      delete budgetUpdates.updatedAt;
      const cleanedUpdates = removeUndefinedValues(budgetUpdates as unknown as Record<string, unknown>);

      if (snapshot.hasSettingsDocument) {
        const settingsUpdate: Record<string, unknown> = {
          updatedAt: now,
          budgetAllocationRevision: nextRevision,
        };
        for (const increase of allocation.increases) {
          settingsUpdate[`overallBudgetLimits.${increase.period}`] = increase.amount;
        }
        transaction.update(settingsRef, settingsUpdate);
      } else {
        transaction.set(settingsRef, buildDefaultUserSettings(userId, allocation.limits, nextRevision, now));
      }

      transaction.update(docRef, {
        ...cleanedUpdates,
        updatedAt: now,
      });
      return { userId, increases: allocation.increases };
    }, operation);
    notifyBudgetLimitIncreases(increases.userId, increases.increases);
  },

  // Delete a budget
  async delete(id: string, operation?: FinancialOperation): Promise<void> {
    if (await hasFinancialReceipt(operation)) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    const ownerSnapshot = await getDocFromServer(docRef);
    if (!ownerSnapshot.exists()) return;
    const userId = ownerSnapshot.data().userId as string | undefined;
    if (!userId) {
      await deleteDoc(docRef);
      return;
    }

    await runBudgetMutationTransaction(userId, async (transaction, snapshot, settingsRef) => {
      const now = Timestamp.now();
      const nextRevision = snapshot.budgetAllocationRevision + 1;
      if (snapshot.hasSettingsDocument) {
        transaction.update(settingsRef, {
          updatedAt: now,
          budgetAllocationRevision: nextRevision,
        });
      } else {
        transaction.set(settingsRef, buildDefaultUserSettings(userId, {}, nextRevision, now));
      }
      transaction.delete(docRef);
    }, operation);
  },

  // Get budget by category
  async getByCategory(userId: string, categoryId: string): Promise<Budget | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as Budget;
  },
};
