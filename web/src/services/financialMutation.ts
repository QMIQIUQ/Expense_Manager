import { doc, getDocFromServer, runTransaction, serverTimestamp, type Firestore, type Transaction } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FinancialOperation { userId: string; operationId: string }
const receiptRef = (database: Firestore, operation: FinancialOperation) =>
  doc(database, 'mutationReceipts', operation.userId, 'operations', operation.operationId);

/** Avoid preparation errors when a committed operation is replayed after a crash. */
export const hasFinancialReceipt = async (operation?: FinancialOperation): Promise<boolean> =>
  operation ? (await getDocFromServer(receiptRef(db, operation))).exists() : false;

/** The receipt and domain writes commit together, fencing late/expired workers remotely. */
export const runFinancialTransaction = async <T>(
  database: Firestore,
  operation: FinancialOperation | undefined,
  apply: (transaction: Transaction) => Promise<T>,
): Promise<T> => runTransaction(database, async (transaction) => {
  if (!operation) return apply(transaction);
  const receipt = receiptRef(database, operation);
  const existing = await transaction.get(receipt);
  if (existing.exists()) return (existing.data().result ?? undefined) as T;
  const result = await apply(transaction);
  transaction.set(receipt, { userId: operation.userId, result: result ?? null, committedAt: serverTimestamp() });
  return result;
});
