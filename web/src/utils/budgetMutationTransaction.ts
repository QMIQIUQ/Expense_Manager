import { runFinancialTransaction, type FinancialOperation } from '../services/financialMutation';
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants/collections';
import type { Budget, OverallBudgetLimits } from '../types';

const COLLECTION_NAME = 'budgets';
const STALE_BUDGET_SNAPSHOT = 'stale-budget-snapshot';

export interface BudgetMutationSnapshot {
  budgets: Budget[];
  overallBudgetLimits?: OverallBudgetLimits;
  budgetAllocationRevision: number;
  hasSettingsDocument: boolean;
}

type BudgetMutation<T> = (
  transaction: Transaction,
  snapshot: BudgetMutationSnapshot,
  settingsRef: DocumentReference,
) => Promise<T>;

const getRevision = (settings: Record<string, unknown> | undefined): number => {
  const revision = settings?.budgetAllocationRevision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
};

const toBudget = (snapshot: QueryDocumentSnapshot): Budget => {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Budget;
};

export async function runBudgetMutationTransaction<T>(userId: string, mutation: BudgetMutation<T>, operation?: FinancialOperation): Promise<T> {
  const settingsRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
  const budgetQuery = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    // Read the revision on both sides of the query so the enumerated budget
    // documents are known to belong to one allocation revision.
    const settingsBeforeBudgets = await getDocFromServer(settingsRef);
    const serverBudgets = await getDocsFromServer(budgetQuery);
    const serverSettings = await getDocFromServer(settingsRef);
    if (
      settingsBeforeBudgets.exists() !== serverSettings.exists() ||
      getRevision(settingsBeforeBudgets.exists() ? settingsBeforeBudgets.data() : undefined) !==
        getRevision(serverSettings.exists() ? serverSettings.data() : undefined)
    ) continue;

    const serverSettingsData = serverSettings.exists() ? serverSettings.data() : undefined;
    const serverRevision = getRevision(serverSettingsData);
    const budgetReferences = serverBudgets.docs.map((budgetDocument) => budgetDocument.ref);

    try {
      return await runFinancialTransaction(db, operation, async (transaction) => {
        const transactionSettings = await transaction.get(settingsRef);
        const transactionSettingsData = transactionSettings.exists() ? transactionSettings.data() : undefined;
        if (
          transactionSettings.exists() !== serverSettings.exists() ||
          getRevision(transactionSettingsData) !== serverRevision
        ) throw new Error(STALE_BUDGET_SNAPSHOT);

        const budgetDocuments = await Promise.all(budgetReferences.map((reference) => transaction.get(reference)));
        const budgets = budgetDocuments.filter((budgetDocument) => budgetDocument.exists()).map(toBudget);
        const snapshot: BudgetMutationSnapshot = {
          budgets,
          overallBudgetLimits: transactionSettingsData?.overallBudgetLimits as OverallBudgetLimits | undefined,
          budgetAllocationRevision: serverRevision,
          hasSettingsDocument: transactionSettings.exists(),
        };
        return mutation(transaction, snapshot, settingsRef);
      });
    } catch (error) {
      if (error instanceof Error && error.message === STALE_BUDGET_SNAPSHOT) continue;
      throw error;
    }
  }

  throw new Error(STALE_BUDGET_SNAPSHOT);
}
