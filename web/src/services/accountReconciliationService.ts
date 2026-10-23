import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, startAfter, Timestamp, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AccountReconciliation, ReconciliationAccount, ReconciliationMark } from '../types/reconciliation';
import { calculateReconciliationMovements, reconciliationFingerprint } from '../utils/reconciliationCalculator';
import { readFinancialPeriod } from './financialPeriodService';
import { convertAmountToCurrency } from './currencyRateService';
import { sessionCache } from '../utils/sessionCache';
import { applyPendingOperations } from '../utils/pendingOperations';
import { networkStatus } from '../utils/networkStatus';
import { hasFinancialReceipt, runFinancialTransaction } from './financialMutation';
import { acceptLocalMutationBatch } from './acceptLocalMutation';
import type { QueuedOperation } from '../utils/offlineQueue';
import type { LocalMutation } from '../utils/localFirstMutation';
import { finalizeReconciliation } from './reconciliationFinalization';
import { requireCurrencyCode } from '../domain/money';

const fail = (message: string): never => { throw Object.assign(new Error(message), { code: 'failed-precondition' }); };
const digest = async (text: string): Promise<string> => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((value) => value.toString(16).padStart(2, '0')).join('');
export const reconciliationId = (userId: string, account: ReconciliationAccount, start: string, end: string) => digest(`${userId}|${account.type}|${account.id}|${start}|${end}`);
export const readReconciliationReport = async (userId: string, account: ReconciliationAccount, start: string, end: string) => {
  const period = await readFinancialPeriod(userId, { startDate: start, endDate: end });
  const movements = await calculateReconciliationMovements(account, period, convertAmountToCurrency);
  return { movements, sourceFingerprint: await reconciliationFingerprint(account, period, movements), readTime: period.readTime };
};
export type ReconciliationReport = Awaited<ReturnType<typeof readReconciliationReport>>;

export const loadReconciliation = async (userId: string, id: string): Promise<AccountReconciliation | undefined> => {
  const cached = sessionCache.get<AccountReconciliation[]>('accountReconciliations', userId) ?? [];
  if (!networkStatus.isOnline) return applyPendingOperations('accountReconciliations', userId, cached).find((row) => row.id === id);
  const snapshot = await getDocFromServer(doc(db, 'accountReconciliations', id));
  const baseline = [...cached.filter((row) => row.id !== id), ...(snapshot.exists() ? [{ ...snapshot.data(), id } as AccountReconciliation] : [])];
  const rows = applyPendingOperations('accountReconciliations', userId, baseline);
  sessionCache.set('accountReconciliations', userId, rows);
  return rows.find((row) => row.id === id);
};
export const loadReconciliationMarks = async (userId: string, id: string): Promise<ReconciliationMark[]> => {
  if (!networkStatus.isOnline) {
    const cached = sessionCache.getSnapshot<ReconciliationMark[]>('reconciliationMarks', userId);
    if (cached?.coverage !== `reconciliation:${id}`) throw Object.assign(new Error('Reconciliation marks are not fully cached'), { code: 'incomplete-cache' });
    return applyPendingOperations('reconciliationMarks', userId, cached.data).filter((row) => row.reconciliationId === id);
  }
  const rows: ReconciliationMark[] = []; let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    const result = await getDocsFromServer(query(collection(db, 'reconciliationMarks'), where('userId', '==', userId), where('reconciliationId', '==', id), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(100)));
    rows.push(...result.docs.map((row) => ({ ...row.data(), id: row.id } as ReconciliationMark)));
    if (result.size < 100) break; cursor = result.docs[result.docs.length - 1];
  }
  const projected = applyPendingOperations('reconciliationMarks', userId, rows);
  sessionCache.set('reconciliationMarks', userId, projected, { coverage: `reconciliation:${id}` });
  return projected.filter((row) => row.reconciliationId === id);
};

export const saveReconciliation = async (record: AccountReconciliation, previous: AccountReconciliation | undefined, report: ReconciliationReport | undefined, checked: Set<string>): Promise<void> => {
  if (![record.openingBalanceMinor, record.statementClosingMinor, record.calculatedClosingMinor].every(Number.isSafeInteger)) fail('Balances must be within supported monetary limits');
  if (record.status === 'complete' && (!report || report.movements.some((row) => !checked.has(row.key)) || record.calculatedClosingMinor !== record.statementClosingMinor)) fail('Complete and check every transaction with zero difference before completing reconciliation');
  const revision = (previous?.revision ?? 0) + 1;
  const draft = { ...record, status: 'draft' as const, revision };
  const operations: LocalMutation[] = [{ entity: 'accountReconciliation', type: previous ? 'update' : 'create', payload: { ...draft, expectedRevision: previous?.revision ?? 0 } }];
  for (const movement of report?.movements ?? []) operations.push({ entity: 'reconciliationMark', type: 'create', payload: {
    id: await digest(`${record.id}|${movement.key}`), userId: record.userId, reconciliationId: record.id,
    transactionKey: movement.key, checked: checked.has(movement.key), sourceFingerprint: record.sourceFingerprint,
  } });
  if (record.status === 'complete') operations.push({ entity: 'accountReconciliation', type: 'update', payload: { ...record, revision: revision + 1, expectedRevision: revision } });
  await acceptLocalMutationBatch(operations);
};

export const commitReconciliationMutation = async (operation: QueuedOperation): Promise<void> => {
  const payload = operation.payload as Record<string, unknown>;
  if (typeof payload.id !== 'string' || typeof payload.userId !== 'string' || operation.type === 'delete') fail('Invalid reconciliation identity');
  const userId = payload.userId as string;
  if (operation.entity === 'reconciliationMark') {
    const mark = payload as unknown as ReconciliationMark;
    if (!mark.reconciliationId || typeof mark.checked !== 'boolean' || typeof mark.transactionKey !== 'string' || !/^[a-f0-9]{64}$/.test(mark.sourceFingerprint)) fail('Invalid reconciliation mark');
    await runFinancialTransaction(db, { userId, operationId: operation.id }, async (transaction) => {
      const parent = await transaction.get(doc(db, 'accountReconciliations', mark.reconciliationId));
      const reference = doc(db, 'reconciliationMarks', mark.id);
      const current = await transaction.get(reference);
      if (!parent.exists() || parent.data().userId !== userId || parent.data().sourceFingerprint !== mark.sourceFingerprint || parent.data().status !== 'draft') fail('Reconciliation changed before saving its marks');
      if (current.exists() && (current.data().userId !== userId || current.data().reconciliationId !== mark.reconciliationId || current.data().transactionKey !== mark.transactionKey)) fail('Reconciliation mark identity changed');
      transaction.set(reference, { ...mark, updatedAt: Timestamp.now() });
    });
    return;
  }
  const record = payload as unknown as AccountReconciliation & { expectedRevision: number };
  if (await hasFinancialReceipt({ userId, operationId: operation.id })) return;
  if (!['bank', 'e_wallet', 'credit_card'].includes(record.accountType) || !['draft', 'complete'].includes(record.status) || !record.accountId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(record.periodEnd) || record.periodStart > record.periodEnd ||
    ![record.openingBalanceMinor, record.statementClosingMinor, record.calculatedClosingMinor, record.revision, record.expectedRevision].every(Number.isSafeInteger)) fail('Invalid reconciliation record');
  if (record.status === 'complete') return finalizeReconciliation(operation);
  await runFinancialTransaction(db, { userId, operationId: operation.id }, async (transaction) => {
    const reference = doc(db, 'accountReconciliations', record.id);
    const current = await transaction.get(reference);
    const accountCollection = record.accountType === 'bank' ? 'banks' : record.accountType === 'e_wallet' ? 'ewallets' : 'cards';
    const accountSnapshot = await transaction.get(doc(db, accountCollection, record.accountId));
    if (!accountSnapshot.exists() || accountSnapshot.data().userId !== userId || requireCurrencyCode(accountSnapshot.data().currency) !== record.currency) fail('Account is missing or its currency changed');
    if (current.exists() && current.data().userId !== userId) fail('Reconciliation owner mismatch');
    if ((current.data()?.revision ?? 0) !== record.expectedRevision) fail('Reconciliation was changed on another device; reload before saving');
    const fields = { ...record } as Record<string, unknown>; delete fields.expectedRevision; delete fields.id;
    for (const [key, value] of Object.entries(fields)) if (value === undefined) delete fields[key];
    transaction.set(reference, { ...fields, createdAt: current.data()?.createdAt ?? Timestamp.now(), updatedAt: Timestamp.now() });
  });
};
