import type { AccountReconciliation, ReconciliationAccount } from '../types/reconciliation';
import type { QueuedOperation } from '../utils/offlineQueue';
import { calculateReconciliationMovements, reconciliationFingerprint } from '../utils/reconciliationCalculator';
import { convertAmountToCurrency } from './currencyRateService';
import { readFinancialPeriod } from './financialPeriodService';
import { encodeFirestoreFields, runFirestoreReadWriteTransaction } from './firestoreReadWriteTransaction';
import { requireCurrencyCode } from '../domain/money';
function fail(message: string): never { throw Object.assign(new Error(message), { code: 'failed-precondition' }); }

export const finalizeReconciliation = async (operation: QueuedOperation): Promise<void> => {
  const record = operation.payload as AccountReconciliation & { expectedRevision: number };
  await runFirestoreReadWriteTransaction(record.userId, async (transaction) => {
    const receiptPath = `mutationReceipts/${record.userId}/operations/${operation.id}`;
    const accountCollection = record.accountType === 'bank' ? 'banks' : record.accountType === 'e_wallet' ? 'ewallets' : 'cards';
    const [receipt, current, accountData] = await transaction.get([receiptPath, `accountReconciliations/${record.id}`, `${accountCollection}/${record.accountId}`]);
    if (receipt) return [];
    if (!accountData || accountData.userId !== record.userId || requireCurrencyCode(typeof accountData.currency === 'string' ? accountData.currency : undefined) !== record.currency) fail('Account is missing or its currency changed');
    if (!current || current.userId !== record.userId || current.revision !== record.expectedRevision) fail('Reconciliation changed on another device');
    const account: ReconciliationAccount = { type: record.accountType, id: record.accountId, name: record.accountName, currency: record.currency };
    const period = await readFinancialPeriod(record.userId, { startDate: record.periodStart, endDate: record.periodEnd }, transaction.id);
    const movements = await calculateReconciliationMovements(account, period, convertAmountToCurrency);
    const fingerprint = await reconciliationFingerprint(account, period, movements);
    if (fingerprint !== record.sourceFingerprint || record.calculatedClosingMinor !== record.statementClosingMinor || record.openingBalanceMinor + movements.reduce((sum, row) => sum + row.deltaMinor, 0) !== record.calculatedClosingMinor) fail('Statement transactions changed; reload and reconcile again');
    const marked = new Set<string>(); let lastId: string | undefined;
    for (;;) {
      const rows = await transaction.query({ from: [{ collectionId: 'reconciliationMarks' }], where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: record.userId } } },
        { fieldFilter: { field: { fieldPath: 'reconciliationId' }, op: 'EQUAL', value: { stringValue: record.id } } },
      ] } }, orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }], limit: 100,
        ...(lastId ? { startAt: { before: false, values: [{ referenceValue: `${transaction.parent}/reconciliationMarks/${lastId}` }] } } : {}),
      });
      for (const mark of rows) if (mark.checked === true && mark.sourceFingerprint === fingerprint && typeof mark.transactionKey === 'string') marked.add(mark.transactionKey);
      if (rows.length < 100) break; lastId = rows[rows.length - 1].id as string;
    }
    if (movements.some((movement) => !marked.has(movement.key))) fail('Reconciliation still has unchecked transactions');
    const fields = { ...record, snapshotReadTime: period.readTime, createdAt: current.createdAt } as Record<string, unknown>;
    delete fields.id; delete fields.expectedRevision; delete fields.updatedAt;
    return [
      { update: { name: `${transaction.parent}/accountReconciliations/${record.id}`, fields: encodeFirestoreFields(fields) }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' as const }] },
      { update: { name: `${transaction.parent}/${receiptPath}`, fields: encodeFirestoreFields({ userId: record.userId, result: null }) }, updateTransforms: [{ fieldPath: 'committedAt', setToServerValue: 'REQUEST_TIME' as const }] },
    ];
  });
};
