import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('../../config/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-expense-manager', appId: 'demo-app' }, 'financial-reliability');
  const auth = getAuth(app); const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { db, auth, firebaseAppInstance: app, friendSpendingEnabled: false, usingFirebaseEmulators: true };
});
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { deleteApp } from 'firebase/app';
import { doc, getDocFromServer, setDoc, deleteDoc, serverTimestamp, getDocsFromServer, collection, query, where, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseAppInstance } from '../../config/firebase';
import { scheduledPaymentService as actualScheduledPaymentService } from '../../services/scheduledPaymentService';
import { expenseService as actualExpenseService } from '../../services/expenseService';
import { commitQueuedEntity } from '../../services/queuedEntityMutation';
import { getHistoryPage } from '../../services/historyService';
import { getConsistentHistoryPage } from '../../services/financialSnapshotService';
import { readExpenseAggregate, summarizeCompleteExpensePeriod } from '../../services/expenseAggregateService';
import { readCompleteExpensePeriod } from '../../services/expensePeriodReadService';
import { filterExpenses } from '../../utils/expensePeriodUtils';
import { offlineQueue } from '../../utils/offlineQueue';
import { incomeService } from '../../services/incomeService';
import { transferService } from '../../services/transferService';
import { budgetService } from '../../services/budgetService';
import { userSettingsService } from '../../services/userSettingsService';
import { DEFAULT_INCOME_LINK } from '../../utils/incomeLinkedBudget';
import { DEFAULT_EXPENSE_FILTERS } from '../../types/expensePeriod';
import { readExpenseRepayments } from '../../services/expenseRepaymentReadService';
import { readReconciliationReport, reconciliationId, saveReconciliation } from '../../services/accountReconciliationService';
import type { AccountReconciliation, ReconciliationAccount } from '../../types/reconciliation';
import type { Expense, ScheduledPaymentRecord } from '../../types';
let uid: string;
const scoped = (id: string) => `${uid}-${id}`;
const scheduledPaymentService = {
  ...actualScheduledPaymentService,
  createPaymentRecord: (record: Parameters<typeof actualScheduledPaymentService.createPaymentRecord>[0], expense?: Parameters<typeof actualScheduledPaymentService.createPaymentRecord>[1], operation?: Parameters<typeof actualScheduledPaymentService.createPaymentRecord>[2]) => actualScheduledPaymentService.createPaymentRecord(
    { ...record, id: scoped(record.id!), scheduledPaymentId: scoped(record.scheduledPaymentId) }, expense ? { ...expense, id: scoped(expense.id!) } : undefined, operation),
  updatePaymentRecord: (id: string, updates: Parameters<typeof actualScheduledPaymentService.updatePaymentRecord>[1], operation?: Parameters<typeof actualScheduledPaymentService.updatePaymentRecord>[2]) => actualScheduledPaymentService.updatePaymentRecord(scoped(id), updates, operation),
  deletePaymentRecord: (id: string, operation?: Parameters<typeof actualScheduledPaymentService.deletePaymentRecord>[1]) => actualScheduledPaymentService.deletePaymentRecord(scoped(id), operation),
};
const expenseService = {
  create: (expense: Parameters<typeof actualExpenseService.create>[0]) => actualExpenseService.create({ ...expense, id: scoped(expense.id!) }),
  update: (id: string, updates: Parameters<typeof actualExpenseService.update>[1], operation?: Parameters<typeof actualExpenseService.update>[2]) => actualExpenseService.update(scoped(id), updates, operation),
  delete: (id: string) => actualExpenseService.delete(scoped(id)),
};
const bankId = `bank-${Date.now()}`;
const snap = async (name: string, id: string) => (await getDocFromServer(doc(db, name, name === 'banks' ? id : scoped(id)))).data();
const operation = (id: string) => ({ userId: uid, operationId: id });
const makeRecord = (id: string) => ({ id, userId: uid, scheduledPaymentId: 'scheduled', periodYear: 2026, periodMonth: 10,
  expectedAmount: 100, actualAmount: 100, difference: 0, paidDate: '2026-10-18', dueDate: '2026-10-18', currency: 'MYR', baseCurrency: 'MYR', baseAmount: 100, paymentMethod: 'bank', bankId } as Omit<ScheduledPaymentRecord, 'createdAt' | 'updatedAt'>);
const makeExpense = (id: string) => ({ id, userId: uid, description: 'Payment test', category: 'Food', amount: 100, currency: 'MYR', baseCurrency: 'MYR', baseAmount: 100,
  date: '2026-10-18', paymentMethod: 'bank', bankId } as Omit<Expense, 'createdAt' | 'updatedAt'>);
beforeAll(async () => {
  uid = (await createUserWithEmailAndPassword(auth, `financial-${Date.now()}@example.test`, 'Test-password-123!')).user.uid;
  await setDoc(doc(db, 'banks', bankId), { userId: uid, name: 'Test bank', balance: 1000, currency: 'MYR' });
  await setDoc(doc(db, 'scheduledPayments', scoped('scheduled')), { userId: uid, name: 'Scheduled test', amount: 100, type: 'subscription', frequency: 'monthly', dueDay: 18 });
  await setDoc(doc(db, 'friendSpendingSummaryStates', uid), { ready: true, version: 1, updatedAt: serverTimestamp() });
});

describe('tags and cross-device view transactions', () => {
  const tag = (id: string, name: string) => ({ id: scoped(id), userId: uid, name, normalizedName: name.toLowerCase(), color: '#64748b', archived: false });
  it('reserves tag names across competing creates and replays do not overwrite newer names', async () => {
    const first = { id: 'tag-create-one', type: 'create' as const, entity: 'expenseTag' as const, payload: tag('tag-one', 'Travel'), timestamp: Date.now(), retryCount: 0 };
    const second = { ...first, id: 'tag-create-two', payload: tag('tag-two', 'Travel') };
    const results = await Promise.allSettled([commitQueuedEntity(first), commitQueuedEntity(second)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const winner = results[0].status === 'fulfilled' ? first : second;
    await commitQueuedEntity({ ...winner, id: 'tag-rename', type: 'update', payload: { ...winner.payload, name: 'Trip', normalizedName: 'trip' } });
    await commitQueuedEntity(winner);
    expect((await getDocFromServer(doc(db, 'expenseTags', winner.payload.id))).data()?.name).toBe('Trip');
    expect((await getDocFromServer(doc(db, 'mutationReceipts', uid, 'operations', winner.id))).exists()).toBe(true);
  });
  it('merges a last view racing a named preset and fences old replays', async () => {
    await userSettingsService.create({ userId: uid, billingCycleDay: 1 });
    const view = { filters: DEFAULT_EXPENSE_FILTERS, period: { mode: 'month' as const, anchorDate: '2026-10-23' } };
    await Promise.all([
      userSettingsService.changeExpenseView(uid, { action: 'upsert', view: { ...view, id: 'food', name: 'Food' } }, operation('view-preset')),
      userSettingsService.changeExpenseView(uid, { action: 'lastView', view }, operation('view-last')),
    ]);
    const preference = (await getDocFromServer(doc(db, 'userSettings', uid))).data()?.expenseViewPreferences;
    expect(preference.savedFilters).toHaveLength(1); expect(preference.lastView).toEqual(view);
    await userSettingsService.changeExpenseView(uid, { action: 'remove', id: 'food' }, operation('view-delete'));
    await userSettingsService.changeExpenseView(uid, { action: 'upsert', view: { ...view, id: 'food', name: 'Food' } }, operation('view-preset'));
    expect((await getDocFromServer(doc(db, 'userSettings', uid))).data()?.expenseViewPreferences.savedFilters).toHaveLength(0);
  });
  it('rejects direct reservation stealing/deletion and permits rename/archive/restore', async () => {
    const payload = tag('protected-tag', 'Protected');
    const queued = { id: 'protected-create', entity: 'expenseTag' as const, type: 'create' as const, payload, timestamp: Date.now(), retryCount: 0 };
    await commitQueuedEntity(queued);
    const reservation = doc(db, 'expenseTagNames', `${uid}:protected`);
    await expect(setDoc(reservation, { userId: uid, tagId: scoped('other-tag'), normalizedName: 'protected' })).rejects.toThrow();
    await expect(setDoc(doc(db, 'expenseTagNames', `${uid}:wrong-name`), { userId: uid, tagId: payload.id, normalizedName: 'wrong-name' })).rejects.toThrow();
    await expect(deleteDoc(reservation)).rejects.toThrow();
    await expect(setDoc(doc(db, 'expenseTags', scoped('direct-no-lock')), { ...tag('direct-no-lock', 'Missinglock'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).rejects.toThrow();
    await commitQueuedEntity({ ...queued, id: 'protected-archive', type: 'update', payload: { ...payload, archived: true } });
    expect((await getDocFromServer(reservation)).exists()).toBe(false);
    await commitQueuedEntity({ ...queued, id: 'protected-restore', type: 'update' });
    expect((await getDocFromServer(reservation)).exists()).toBe(true);
    await commitQueuedEntity({ ...queued, id: 'protected-rename', type: 'update', payload: { ...payload, name: 'Renamed', normalizedName: 'renamed' } });
    expect((await getDocFromServer(reservation)).exists()).toBe(false);
  });
});

describe('income-linked budget transactions and rules', () => {
  it('serializes a manual restoration racing a new monthly allocation', async () => {
    await userSettingsService.create({ userId: uid, billingCycleDay: 1, displayCurrency: 'MYR' });
    const linked = { ...DEFAULT_INCOME_LINK, enabled: true };
    await userSettingsService.setIncomeLinkedBudget(uid, linked, undefined, operation('race-enable'));
    const budget = { id: scoped('race-budget'), userId: uid, categoryId: scoped('food'), categoryName: 'Food', amount: 700,
      currency: 'MYR' as const, period: 'monthly' as const, startDate: '2026-10-01', alertThreshold: 80 };
    const outcomes = await Promise.allSettled([
      userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, 500, operation('race-disable')),
      budgetService.create(budget, operation('race-create')),
    ]);
    if (outcomes[1].status === 'rejected') throw outcomes[1].reason;
    const settings = (await getDocFromServer(doc(db, 'userSettings', uid))).data()!;
    const created = (await getDocFromServer(doc(db, 'budgets', budget.id))).exists();
    expect(created).toBe(true);
    if (!settings.incomeLinkedBudget.enabled) expect(settings.overallBudgetLimits.monthly).toBeGreaterThanOrEqual(700);
    await budgetService.delete(budget.id, operation('race-clean'));
    await userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, 500, operation('race-reset'));
  });
  it('preserves the manual cap, bypasses only monthly auto-increase, and restores manual mode atomically', async () => {
    const settingsRef = doc(db, 'userSettings', uid);
    await userSettingsService.create({ userId: uid, billingCycleDay: 1, displayCurrency: 'MYR' });
    await userSettingsService.setOverallBudgetLimit(uid, 'monthly', 500, operation('linked-manual-baseline'));
    await userSettingsService.setOverallBudgetLimit(uid, 'weekly', 50, operation('linked-weekly-baseline'));
    const linked = { ...DEFAULT_INCOME_LINK, enabled: true, percentage: 33.33 };
    await userSettingsService.setIncomeLinkedBudget(uid, linked, undefined, operation('enable-linked'));
    const revision = (await getDocFromServer(settingsRef)).data()?.budgetAllocationRevision;
    await userSettingsService.setIncomeLinkedBudget(uid, linked, undefined, operation('enable-linked'));
    expect((await getDocFromServer(settingsRef)).data()?.budgetAllocationRevision).toBe(revision);
    await expect(userSettingsService.setOverallBudgetLimit(uid, 'monthly', 5000, operation('old-client-limit'))).rejects.toThrow('income-linked-budget-active');
    const value = { id: scoped('linked-monthly'), userId: uid, categoryId: scoped('food'), categoryName: 'Food', amount: 700, currency: 'MYR' as const,
      period: 'monthly' as const, startDate: '2026-10-01', alertThreshold: 80 };
    await budgetService.create(value, operation('linked-budget-create'));
    expect((await getDocFromServer(settingsRef)).data()?.overallBudgetLimits.monthly).toBe(500);
    await budgetService.create({ ...value, id: scoped('linked-weekly'), period: 'weekly', amount: 100 }, operation('linked-weekly-create'));
    expect((await getDocFromServer(settingsRef)).data()?.overallBudgetLimits.weekly).toBe(100);
    await expect(userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, undefined, operation('restore-too-small'))).rejects.toThrow();
    expect((await getDocFromServer(settingsRef)).data()?.incomeLinkedBudget.enabled).toBe(true);
    await userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, 1000, operation('restore-valid'));
    await userSettingsService.setIncomeLinkedBudget(uid, linked, undefined, operation('enable-newer'));
    await userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, 1000, operation('restore-valid'));
    expect((await getDocFromServer(settingsRef)).data()).toMatchObject({ incomeLinkedBudget: linked, overallBudgetLimits: { monthly: 1000 } });
    await budgetService.delete(value.id, operation('linked-clean-monthly'));
    await budgetService.delete(scoped('linked-weekly'), operation('linked-clean-weekly'));
    await userSettingsService.setIncomeLinkedBudget(uid, { ...linked, enabled: false }, 1000, operation('linked-clean-mode'));
  });
  it('rejects malformed policies and old clients changing the saved cap while linked', async () => {
    const ref = doc(db, 'userSettings', uid);
    const current = (await getDocFromServer(ref)).data()!;
    const revision = current.budgetAllocationRevision;
    for (const config of [{ ...DEFAULT_INCOME_LINK, enabled: 'yes' }, { ...DEFAULT_INCOME_LINK, percentage: 100.01 }, { ...DEFAULT_INCOME_LINK, percentage: 1.001 }]) {
      await expect(setDoc(ref, { incomeLinkedBudget: config, budgetAllocationRevision: revision + 1 }, { merge: true })).rejects.toThrow();
    }
    const enabled = { ...DEFAULT_INCOME_LINK, enabled: true };
    await userSettingsService.setIncomeLinkedBudget(uid, enabled, undefined, operation('rules-enable'));
    const latest = (await getDocFromServer(ref)).data()!;
    await expect(setDoc(ref, { 'overallBudgetLimits': { monthly: 5000 }, budgetAllocationRevision: latest.budgetAllocationRevision + 1 }, { merge: true })).rejects.toThrow();
    await expect(setDoc(ref, { incomeLinkedBudget: { ...enabled, percentage: 50 } }, { merge: true })).rejects.toThrow();
    await userSettingsService.setIncomeLinkedBudget(uid, { ...enabled, enabled: false }, 1000, operation('rules-clean'));
  });
});
afterAll(async () => { await deleteApp(firebaseAppInstance!); });
describe('actual Firebase atomic financial mutations', () => {
  it('commits record + expense + balance + summary, and replays a crashed acknowledgment exactly once', async () => {
    await scheduledPaymentService.createPaymentRecord(makeRecord('record-a'), makeExpense('expense-a'), operation('create-a'));
    expect((await snap('banks', bankId))?.balance).toBe(900);
    expect((await snap('scheduledPaymentRecords', 'record-a'))?.generatedExpenseId).toBe(scoped('expense-a'));
    expect((await snap('expenses', 'expense-a'))?.scheduledPaymentRecordId).toBe(scoped('record-a'));
    await scheduledPaymentService.createPaymentRecord(makeRecord('record-a'), makeExpense('expense-a'), operation('create-a'));
    expect((await snap('banks', bankId))?.balance).toBe(900);
    const buckets = await getDocsFromServer(collection(db, 'friendSpendingSummaries', uid, 'dailyBuckets'));
    expect(buckets.docs.reduce((sum, row) => sum + row.data().amount, 0)).toBe(100);
  });
  it('updates the record, linked expense, account and summary in one transaction', async () => {
    await scheduledPaymentService.updatePaymentRecord('record-a', { actualAmount: 150, baseAmount: 150 }, operation('update-a'));
    expect((await snap('banks', bankId))?.balance).toBe(850);
    expect((await snap('expenses', 'expense-a'))?.amount).toBe(150);
    expect((await snap('scheduledPaymentRecords', 'record-a'))?.difference).toBe(50);
    await scheduledPaymentService.updatePaymentRecord('record-a', { actualAmount: 150, baseAmount: 150 }, operation('update-a'));
    expect((await snap('banks', bankId))?.balance).toBe(850);
  });
  it('also keeps payment history consistent when its generated expense is edited', async () => {
    await expenseService.update('expense-a', { amount: 125, baseAmount: 125 }, operation('expense-edit-a'));
    expect((await snap('scheduledPaymentRecords', 'record-a'))?.actualAmount).toBe(125);
    expect((await snap('banks', bankId))?.balance).toBe(875);
  });
  it('reverses deletion exactly once and removes both linked documents', async () => {
    await scheduledPaymentService.deletePaymentRecord('record-a', operation('delete-a'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
    expect(await snap('expenses', 'expense-a')).toBeUndefined();
    expect(await snap('scheduledPaymentRecords', 'record-a')).toBeUndefined();
    await scheduledPaymentService.deletePaymentRecord('record-a', operation('delete-a'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('deduplicates concurrent confirmations of the same intended payment, even with different outbox IDs', async () => {
    const id = scheduledPaymentService.createPaymentRecordId(uid, 'scheduled', 2026, 11);
    await Promise.all([
      scheduledPaymentService.createPaymentRecord(makeRecord(id), makeExpense('expense-b'), operation('concurrent-a')),
      scheduledPaymentService.createPaymentRecord(makeRecord(id), makeExpense('expense-b'), operation('concurrent-b')),
    ]);
    expect((await snap('banks', bankId))?.balance).toBe(900);
    const rows = await getDocsFromServer(query(collection(db, 'scheduledPaymentRecords'), where('userId', '==', uid)));
    expect(rows.size).toBe(1);
    await scheduledPaymentService.deletePaymentRecord(id, operation('delete-b'));
  });
  it('aborts all writes if the referenced account does not exist', async () => {
    await expect(scheduledPaymentService.createPaymentRecord(makeRecord('missing-record'), { ...makeExpense('missing-expense'), bankId: 'missing-account' }, operation('missing-account'))).rejects.toThrow();
    expect(await snap('scheduledPaymentRecords', 'missing-record')).toBeUndefined();
    expect(await snap('expenses', 'missing-expense')).toBeUndefined();
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('does not reset a changed account balance when a generic account create is replayed', async () => {
    await commitQueuedEntity({ id: 'bank-replay', type: 'create', entity: 'bank', timestamp: Date.now(), retryCount: 0, payload: { id: bankId, userId: uid, balance: 9999, currency: 'MYR' } });
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('protects receipts and financial documents from another owner', async () => {
    await expect(scheduledPaymentService.updatePaymentRecord('missing-record', { userId: 'other' }, { userId: 'other', operationId: 'bad-owner' })).rejects.toThrow();
    await expect(setDoc(doc(db, 'mutationReceipts', uid, 'operations', 'create-a'), { userId: uid })).rejects.toThrow();
  });
  it('keeps 1105-record totals exact while history advances in bounded non-overlapping cursor pages', async () => {
    for (let start = 0; start < 1105; start += 400) {
      const batch = writeBatch(db);
      for (let index = start; index < Math.min(1105, start + 400); index++) {
        batch.set(doc(db, 'expenses', scoped(`history-${String(index).padStart(4, '0')}`)), {
          userId: uid, description: 'Historical expense', amount: index === 10 ? 3 : 1,
          category: 'Food', date: '2025-01-01', ...(index === 10 ? { currency: 'USD', exchangeRate: 4 } : {}),
        });
      }
      await batch.commit();
    }
    const first = await getHistoryPage<Expense>('expenses', uid);
    expect(first.rows).toHaveLength(100); expect(first.hasMore).toBe(true);
    const second = await getHistoryPage<Expense>('expenses', uid, undefined, first.cursor);
    expect(second.rows).toHaveLength(100);
    expect(second.rows.some((row) => first.rows.some((old) => row.id === old.id))).toBe(false);
    const pinnedFirst = await getConsistentHistoryPage<Expense>('expenses', uid);
    const laterId = scoped('history-0950');
    await setDoc(doc(db, 'expenses', laterId), { amount: 99 }, { merge: true });
    const pinnedSecond = await getConsistentHistoryPage<Expense>('expenses', uid, undefined, pinnedFirst.cursor, pinnedFirst.readTime);
    expect(pinnedSecond.rows).toHaveLength(100);
    // A page traversal must preserve its timestamp even when another write happens.
    expect(pinnedSecond.readTime).toBe(pinnedFirst.readTime);
    expect(pinnedSecond.rows.find((row) => row.id === laterId)?.amount).toBe(1);
    await setDoc(doc(db, 'expenses', laterId), { amount: 1 }, { merge: true });
    await offlineQueue.clear();
    await offlineQueue.enqueue({ type: 'update', entity: 'expense', payload: { id: scoped('history-0000'), userId: uid, amount: 5 } });
    await offlineQueue.enqueue({ type: 'delete', entity: 'expense', payload: { id: scoped('history-0001'), userId: uid } });
    await offlineQueue.enqueue({ type: 'create', entity: 'expense', payload: { id: scoped('history-local'), userId: uid, amount: 7, date: '2025-01-01', category: 'Food' } });
    const aggregate = await readExpenseAggregate(uid, 'MYR', undefined, (rows) => rows, () => true);
    expect(aggregate.count).toBe(1105);
    expect(aggregate.total).toBe(1105 + 11 + 4 - 1 + 7);
    expect(aggregate.categories.Food).toBe(aggregate.total);
    // Both real multi-page paths must agree, including a pending generated payment expense.
    await offlineQueue.enqueue({ type: 'create', entity: 'scheduledPaymentRecord', payload: {
      id: scoped('history-payment'), userId: uid, scheduledPaymentId: scoped('history-schedule'),
      generatedExpensePayload: { id: scoped('history-generated'), userId: uid, amount: 300, currency: 'JPY', baseCurrency: 'MYR', baseAmount: 10,
        category: 'Bills', description: 'Generated payment', paymentMethod: 'bank', bankId, date: '2025-01-01' },
    } });
    const period = await readCompleteExpensePeriod(uid);
    localStorage.setItem('expense_manager_currency_rate_2025-01-01:MYR:JPY', JSON.stringify({
      fromCurrency: 'MYR', toCurrency: 'JPY', rate: 31.25, rateDate: '2025-01-01', provider: 'emulator-fixture', fetchedAt: new Date().toISOString(),
    }));
    for (const currency of ['MYR', 'JPY'] as const) for (const filter of [
      { query: '', category: '', paymentMethod: 'all' as const, sort: 'date-desc' as const },
      { query: 'Historical', category: 'Food', paymentMethod: 'all' as const, sort: 'date-desc' as const },
      { query: '', category: 'Bills', paymentMethod: 'bank' as const, sort: 'date-desc' as const },
    ]) {
      const select = (rows: Expense[]) => filterExpenses(rows, filter);
      const streamed = await readExpenseAggregate(uid, currency, undefined, select, () => true);
      const shared = await summarizeCompleteExpensePeriod(uid, period.rows, currency, undefined, select, () => true);
      expect(shared).toEqual(streamed);
      if (filter.category === 'Bills') { expect(shared.count).toBe(1); expect(shared.total).toBe(currency === 'MYR' ? 10 : 300); }
    }
    await offlineQueue.clear();
  });
  it('retains the effective default bank source through later payment edits', async () => {
    const record = { ...makeRecord('default-source'), paymentMethod: undefined, bankId: undefined };
    await scheduledPaymentService.createPaymentRecord(record, makeExpense('default-expense'), operation('default-create'));
    expect((await snap('scheduledPaymentRecords', 'default-source'))?.bankId).toBe(bankId);
    await scheduledPaymentService.updatePaymentRecord('default-source', { actualAmount: 120 }, operation('default-update'));
    expect((await snap('banks', bankId))?.balance).toBe(880);
    await scheduledPaymentService.deletePaymentRecord('default-source', operation('default-delete'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('rejects an orphan confirmation without committing any financial document', async () => {
    await expect(scheduledPaymentService.createPaymentRecord({ ...makeRecord('orphan'), scheduledPaymentId: 'removed-parent' }, makeExpense('orphan-expense'), operation('orphan-create'))).rejects.toThrow('no longer available');
    expect(await snap('scheduledPaymentRecords', 'orphan')).toBeUndefined();
    expect(await snap('expenses', 'orphan-expense')).toBeUndefined();
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('cannot attach an unrelated existing expense to a payment, or clear only one side of its bank link', async () => {
    await expenseService.create({ ...makeExpense('unrelated'), paymentMethod: 'cash' });
    await expect(scheduledPaymentService.createPaymentRecord(makeRecord('collision'), makeExpense('unrelated'), operation('collision'))).rejects.toThrow('cannot be attached');
    expect(await snap('scheduledPaymentRecords', 'collision')).toBeUndefined();
    await expenseService.delete('unrelated');
    await scheduledPaymentService.createPaymentRecord(makeRecord('clear-source'), makeExpense('clear-expense'), operation('clear-create'));
    await expenseService.update('clear-expense', { paymentMethod: 'cash', bankId: undefined }, operation('clear-bank'));
    expect((await snap('scheduledPaymentRecords', 'clear-source'))?.bankId).toBeUndefined();
    expect((await snap('expenses', 'clear-expense'))?.bankId).toBeUndefined();
    expect((await snap('banks', bankId))?.balance).toBe(1000);
    await scheduledPaymentService.deletePaymentRecord('clear-source', operation('clear-delete'));
  });
  it('requires a fresh booked valuation for a changed foreign payment and never partially debits on rejection', async () => {
    await scheduledPaymentService.createPaymentRecord({ ...makeRecord('foreign'), currency: 'USD', baseAmount: 400, exchangeRate: 4 },
      { ...makeExpense('foreign-expense'), currency: 'USD', baseAmount: 400, exchangeRate: 4 }, operation('foreign-create'));
    expect((await snap('banks', bankId))?.balance).toBe(600);
    await expect(scheduledPaymentService.updatePaymentRecord('foreign', { actualAmount: 150 }, operation('foreign-update'))).rejects.toThrow('currency snapshot');
    expect((await snap('banks', bankId))?.balance).toBe(600);
    expect((await snap('expenses', 'foreign-expense'))?.amount).toBe(100);
    await scheduledPaymentService.updatePaymentRecord('foreign', { actualAmount: 150, baseAmount: 600, exchangeRate: 4 }, operation('foreign-update'));
    expect((await snap('banks', bankId))?.balance).toBe(400);
    await scheduledPaymentService.deletePaymentRecord('foreign', operation('foreign-delete'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('applies income create/edit/delete receipts exactly once', async () => {
    const id = scoped('income');
    const value = { id, userId: uid, amount: 50, baseAmount: 50, currency: 'MYR' as const, baseCurrency: 'MYR' as const, date: '2026-10-18', type: 'salary' as const, paymentMethod: 'bank' as const, bankId };
    await incomeService.create(value, operation('income-create'));
    await incomeService.create(value, operation('income-create'));
    expect((await snap('banks', bankId))?.balance).toBe(1050);
    await incomeService.update(id, { amount: 70, baseAmount: 70 }, operation('income-update'));
    await incomeService.update(id, { amount: 70, baseAmount: 70 }, operation('income-update'));
    expect((await snap('banks', bankId))?.balance).toBe(1070);
    await incomeService.delete(id, uid, operation('income-delete'));
    await incomeService.delete(id, uid, operation('income-delete'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
  });
  it('atomically reverses and reapplies transfer edits without repeating either account movement', async () => {
    const destination = scoped('transfer-bank');
    await setDoc(doc(db, 'banks', destination), { userId: uid, name: 'Destination', currency: 'MYR', balance: 500 });
    const id = scoped('transfer');
    const value = { id, userId: uid, amount: 30, toAmount: 30, date: '2026-10-18', currency: 'MYR' as const, baseCurrency: 'MYR' as const, baseAmount: 30,
      fromPaymentMethod: 'bank' as const, fromBankId: bankId, toPaymentMethod: 'bank' as const, toBankId: destination };
    await transferService.create(value, operation('transfer-create'));
    await transferService.create(value, operation('transfer-create'));
    expect((await snap('banks', bankId))?.balance).toBe(970);
    expect((await snap('banks', destination))?.balance).toBe(530);
    await transferService.update(id, { amount: 40, toAmount: 40, baseAmount: 40 }, operation('transfer-update'));
    await transferService.update(id, { amount: 40, toAmount: 40, baseAmount: 40 }, operation('transfer-update'));
    expect((await snap('banks', bankId))?.balance).toBe(960);
    expect((await snap('banks', destination))?.balance).toBe(540);
    await transferService.deleteWithBalanceReversal(id, uid, operation('transfer-delete'));
    await transferService.deleteWithBalanceReversal(id, uid, operation('transfer-delete'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
    expect((await snap('banks', destination))?.balance).toBe(500);
  });
  it('deletes a payment and reverses its explicitly linked transfer in the same receipt transaction', async () => {
    const source = scoped('linked-transfer-bank');
    await setDoc(doc(db, 'banks', source), { userId: uid, name: 'Reimbursement source', currency: 'MYR', balance: 500 });
    await scheduledPaymentService.createPaymentRecord(makeRecord('with-transfer'), makeExpense('linked-expense'), operation('linked-payment-create'));
    const transferId = scoped('linked-transfer');
    await transferService.create({ id: transferId, userId: uid, amount: 30, toAmount: 30, currency: 'MYR', baseCurrency: 'MYR', baseAmount: 30, date: '2026-10-18',
      fromPaymentMethod: 'bank', fromBankId: source, toPaymentMethod: 'bank', toBankId: bankId, expenseId: scoped('linked-expense') }, operation('linked-transfer-create'));
    expect((await snap('banks', bankId))?.balance).toBe(930);
    await scheduledPaymentService.deletePaymentRecord('with-transfer', operation('linked-payment-delete'));
    expect((await snap('banks', bankId))?.balance).toBe(1000);
    expect((await snap('banks', source))?.balance).toBe(500);
    expect((await getDocFromServer(doc(db, 'transfers', transferId))).exists()).toBe(false);
  });
  it('preserves budget allocation revisions and limit validation when budget receipts replay', async () => {
    await userSettingsService.create({ userId: uid, billingCycleDay: 1, displayCurrency: 'MYR' });
    await userSettingsService.setOverallBudgetLimit(uid, 'monthly', 500, operation('limit-create'));
    const id = scoped('budget');
    const value = { id, userId: uid, categoryId: scoped('food'), categoryName: 'Food', amount: 200, currency: 'MYR' as const, baseCurrency: 'MYR' as const, baseAmount: 200,
      period: 'monthly' as const, startDate: '2026-10-01', alertThreshold: 80 };
    await budgetService.create(value, operation('budget-create'));
    const revision = (await getDocFromServer(doc(db, 'userSettings', uid))).data()?.budgetAllocationRevision;
    await budgetService.create(value, operation('budget-create'));
    expect((await getDocFromServer(doc(db, 'userSettings', uid))).data()?.budgetAllocationRevision).toBe(revision);
    await expect(userSettingsService.setOverallBudgetLimit(uid, 'monthly', 100, operation('limit-too-low'))).rejects.toThrow();
    expect((await getDocFromServer(doc(db, 'userSettings', uid))).data()?.overallBudgetLimits.monthly).toBe(500);
    await budgetService.update(id, { amount: 250, baseAmount: 250 }, operation('budget-update'));
    await budgetService.delete(id, operation('budget-delete'));
    await budgetService.delete(id, operation('budget-delete'));
    expect((await getDocFromServer(doc(db, 'budgets', id))).exists()).toBe(false);
  });
});

describe('split repayment atomic settlement', () => {
  afterAll(async () => {
    for (const id of ['split-life', 'split-race', 'split-legacy', 'split-rules']) {
      const rows = await getDocsFromServer(query(collection(db, 'repayments'), where('userId', '==', uid), where('expenseId', '==', scoped(id))));
      for (const row of rows.docs) await commitQueuedEntity({ id: `cleanup-${row.id}`, entity: 'repayment', type: 'delete', payload: { id: row.id, userId: uid, expenseId: scoped(id) }, timestamp: Date.now(), retryCount: 0 });
      await deleteDoc(doc(db, 'expenses', scoped(id)));
    }
    await setDoc(doc(db, 'banks', bankId), { balance: 1000 }, { merge: true });
  });
  const splitExpense = (id: string) => ({ ...makeExpense(scoped(id)), id: scoped(id), amount: 120, baseAmount: 120, paymentMethod: 'cash' as const,
    splitParticipants: [{ id: 'a', name: 'A', owedMinor: 4000 }, { id: 'b', name: 'B', owedMinor: 4000 }] });
  const repayment = (id: string, expenseId: string, amount: number) => ({ id: scoped(id), userId: uid, expenseId: scoped(expenseId), amount, baseAmount: amount,
    currency: 'MYR', baseCurrency: 'MYR', date: '2026-10-23', paymentMethod: 'bank', bankId, splitParticipantId: 'a', settledExpenseCurrency: 'MYR', settledExpenseMinor: amount * 100 });
  it('commits receipts, participant counters and bank deltas once through create/edit/delete replays', async () => {
    await actualExpenseService.create(splitExpense('split-life'));
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    const create = { id: 'split-repay-create', entity: 'repayment' as const, type: 'create' as const, payload: repayment('split-repay', 'split-life', 20), timestamp: Date.now(), retryCount: 0 };
    await commitQueuedEntity(create);
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline + 20);
    expect((await getDocFromServer(doc(db, 'expenses', scoped('split-life')))).data()!.splitPaidMinor.a).toBe(2000);
    const update = { ...create, id: 'split-repay-edit', type: 'update' as const, payload: repayment('split-repay', 'split-life', 30) };
    await commitQueuedEntity(update); await commitQueuedEntity(create);
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline + 30);
    await expect(actualExpenseService.update(scoped('split-life'), { splitParticipants: [] }, operation('invalid-remove-split'))).rejects.toThrow();
    await expect(actualExpenseService.delete(scoped('split-life'), operation('invalid-delete-split'))).rejects.toThrow();
    await commitQueuedEntity({ ...create, id: 'split-repay-delete', type: 'delete' }); await commitQueuedEntity(update);
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline);
    expect((await getDocFromServer(doc(db, 'repayments', create.payload.id))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'expenses', scoped('split-life')))).data()!.splitPaidMinor.a).toBeUndefined();
  });
  it('serializes competing collections without over-settling a participant or partly adjusting a bank', async () => {
    await actualExpenseService.create(splitExpense('split-race'));
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    const outcomes = await Promise.allSettled([1, 2].map((number) => commitQueuedEntity({ id: `split-race-op-${number}`, entity: 'repayment', type: 'create',
      payload: repayment(`split-race-${number}`, 'split-race', 30), timestamp: Date.now(), retryCount: 0 })));
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline + 30);
    expect((await getDocFromServer(doc(db, 'expenses', scoped('split-race')))).data()!.splitPaidMinor.a).toBe(3000);
  });
  it('rejects standalone counter edits, forged split settlements and uncoupled repayment updates/deletes', async () => {
    await actualExpenseService.create(splitExpense('split-rules'));
    const payload = repayment('rules-repay', 'split-rules', 20);
    await expect(setDoc(doc(db, 'repayments', payload.id), payload)).rejects.toThrow();
    await commitQueuedEntity({ id: 'rules-repay-create', entity: 'repayment', type: 'create', payload, timestamp: Date.now(), retryCount: 0 });
    const parent = doc(db, 'expenses', scoped('split-rules'));
    await expect(setDoc(parent, { splitPaidMinor: { a: 0 } }, { merge: true })).rejects.toThrow();
    await expect(setDoc(parent, { splitParticipants: [] }, { merge: true })).rejects.toThrow();
    await expect(setDoc(doc(db, 'repayments', payload.id), { settledExpenseMinor: 1000 }, { merge: true })).rejects.toThrow();
    await expect(deleteDoc(doc(db, 'repayments', payload.id))).rejects.toThrow();
    expect((await getDocFromServer(parent)).data()!.splitPaidMinor.a).toBe(2000);
    expect((await getDocFromServer(doc(db, 'repayments', payload.id))).data()!.settledExpenseMinor).toBe(2000);
  });
  it('links a legacy repayment without posting its old amount retroactively', async () => {
    await actualExpenseService.create(splitExpense('split-legacy'));
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    const payload = repayment('legacy-repay', 'split-legacy', 20);
    await setDoc(doc(db, 'repayments', payload.id), { ...payload, splitParticipantId: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await commitQueuedEntity({ id: 'legacy-repay-link', entity: 'repayment', type: 'update', payload, timestamp: Date.now(), retryCount: 0 });
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline);
    expect((await getDocFromServer(doc(db, 'expenses', scoped('split-legacy')))).data()!.splitPaidMinor.a).toBe(2000);
  });
});

describe('reconciliation snapshots and separate transaction marks', () => {
  afterAll(async () => {
    await deleteDoc(doc(db, 'expenses', scoped('reconcile-source')));
    await setDoc(doc(db, 'banks', bankId), { balance: 1000 }, { merge: true });
  });
  it('persists the complete draft/marks/final intent together and rejects a changed-period completion', async () => {
    await offlineQueue.clear();
    const account: ReconciliationAccount = { type: 'bank', id: bankId, name: 'Test bank', currency: 'MYR' };
    await actualExpenseService.create({ ...makeExpense('reconcile-source'), id: scoped('reconcile-source'), date: '2026-04-01', amount: 10, baseAmount: 10 });
    const report = await readReconciliationReport(uid, account, '2026-04-01', '2026-04-01');
    expect(report.movements.reduce((sum, row) => sum + row.deltaMinor, 0)).toBe(-1000);
    const id = await reconciliationId(uid, account, '2026-04-01', '2026-04-01');
    const record: AccountReconciliation = { id, userId: uid, accountId: bankId, accountName: account.name, accountType: 'bank', currency: 'MYR',
      periodStart: '2026-04-01', periodEnd: '2026-04-01', openingBalanceMinor: 10000, statementClosingMinor: 9000, calculatedClosingMinor: 9000,
      sourceFingerprint: report.sourceFingerprint, status: 'complete', revision: 2 };
    await expect(saveReconciliation(record, undefined, report, new Set())).rejects.toThrow();
    await saveReconciliation(record, undefined, report, new Set(report.movements.map((row) => row.key)));
    const operations = offlineQueue.getAll().filter((row) => ['accountReconciliation', 'reconciliationMark'].includes(row.entity));
    expect(operations).toHaveLength(3);
    for (const queued of operations) await commitQueuedEntity(queued);
    const saved = (await getDocFromServer(doc(db, 'accountReconciliations', id))).data()!;
    expect(saved.status).toBe('complete'); expect(saved.revision).toBe(2);
    await actualExpenseService.update(scoped('reconcile-source'), { amount: 11, baseAmount: 11 });
    const final = operations[operations.length - 1];
    await commitQueuedEntity(final); // A committed receipt must bypass a now-stale source preflight.
    await expect(commitQueuedEntity({ ...final, id: 'reconcile-stale-new-op', payload: { ...(final.payload as object), revision: 3, expectedRevision: 2 } })).rejects.toThrow('changed');
    expect((await getDocFromServer(doc(db, 'accountReconciliations', id))).data()!.revision).toBe(2);
    await offlineQueue.clear();
  });
});

describe('large and concurrent reconciliation finalization', () => {
  it('rejects a source change inserted as finalization begins and keeps the draft and pending intent', async () => {
    await offlineQueue.clear();
    const idSource = scoped('reconcile-race');
    await actualExpenseService.create({ ...makeExpense('race'), id: idSource, date: '2026-03-03', amount: 10, baseAmount: 10 });
    const account: ReconciliationAccount = { type: 'bank', id: bankId, name: 'Test bank', currency: 'MYR' };
    const report = await readReconciliationReport(uid, account, '2026-03-03', '2026-03-03');
    const id = await reconciliationId(uid, account, '2026-03-03', '2026-03-03');
    await saveReconciliation({ id, userId: uid, accountType: 'bank', accountId: bankId, accountName: account.name, currency: 'MYR', periodStart: '2026-03-03', periodEnd: '2026-03-03', openingBalanceMinor: 10000, statementClosingMinor: 9000, calculatedClosingMinor: 9000, sourceFingerprint: report.sourceFingerprint, status: 'complete', revision: 2 }, undefined, report, new Set(report.movements.map((row) => row.key)));
    const operations = offlineQueue.getAll();
    for (const operation of operations.slice(0, -1)) await commitQueuedEntity(operation);
    const originalFetch = globalThis.fetch; let changed = false;
    const intercepted = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith(':beginTransaction') && !changed) {
        changed = true;
        await actualExpenseService.update(idSource, { amount: 11, baseAmount: 11 });
      }
      return originalFetch(input, init);
    });
    const final = operations[operations.length - 1];
    try { await expect(commitQueuedEntity(final)).rejects.toThrow('changed'); } finally { intercepted.mockRestore(); }
    expect((await getDocFromServer(doc(db, 'accountReconciliations', id))).data()!.status).toBe('draft');
    expect((await getDocFromServer(doc(db, 'mutationReceipts', uid, 'operations', final.id))).exists()).toBe(false);
    expect(offlineQueue.getAll().some((operation) => operation.id === final.id)).toBe(true);
    await offlineQueue.clear();
  });
  it('traverses and finalizes 1005 movements with paged marks and safe interrupted/replayed intents', async () => {
    const started = performance.now(); let lastStage = started;
    const stage = (name: string) => { const now = performance.now(); console.info('reconciliation-1005-phase', JSON.stringify({ name, elapsedMs: Math.round(now - lastStage), totalMs: Math.round(now - started) })); lastStage = now; };
    await offlineQueue.clear();
    const account: ReconciliationAccount = { type: 'bank', id: scoped('large-bank'), name: 'Large statement', currency: 'MYR' };
    await setDoc(doc(db, 'banks', account.id), { userId: uid, name: account.name, balance: 995, currency: 'MYR' });
    for (let start = 0; start < 1005; start += 400) {
      const batch = writeBatch(db);
      for (let index = start; index < Math.min(1005, start + 400); index++) batch.set(doc(db, 'expenses', scoped(`large-${index}`)), { userId: uid, description: `Statement ${index}`, category: 'Food', date: '2026-02-01', amount: 1, currency: 'MYR', paymentMethod: 'bank', bankId: account.id });
      await batch.commit();
    }
    stage('seed');
    const report = await readReconciliationReport(uid, account, '2026-02-01', '2026-02-01');
    expect(report.movements).toHaveLength(1005); stage('full-period-read');
    const id = await reconciliationId(uid, account, '2026-02-01', '2026-02-01');
    await saveReconciliation({ id, userId: uid, accountType: 'bank', accountId: account.id, accountName: account.name, currency: 'MYR', periodStart: '2026-02-01', periodEnd: '2026-02-01', openingBalanceMinor: 200000, statementClosingMinor: 99500, calculatedClosingMinor: 99500, sourceFingerprint: report.sourceFingerprint, status: 'complete', revision: 2 }, undefined, report, new Set(report.movements.map((row) => row.key)));
    stage('durable-local-batch');
    const operations = offlineQueue.getAll(); expect(operations).toHaveLength(1007);
    await commitQueuedEntity(operations[0]); stage('draft-commit');
    await expect(commitQueuedEntity({ ...operations[1], id: 'interrupted-mark', payload: { ...(operations[1].payload as object), reconciliationId: 'missing' } })).rejects.toThrow();
    for (const operation of operations.slice(1, -1)) await commitQueuedEntity(operation);
    stage('1005-mark-transactions');
    await commitQueuedEntity(operations[1]);
    await commitQueuedEntity(operations[operations.length - 1]); await commitQueuedEntity(operations[operations.length - 1]);
    stage('finalization-and-replay');
    expect((await getDocFromServer(doc(db, 'accountReconciliations', id))).data()!.status).toBe('complete');
    await offlineQueue.clear();
  }, 120000);
});

describe('booked foreign-account movements and scoped repayment history', () => {
  it('keeps the actual SGD debit stable when later exchange quotes change', async () => {
    const account: ReconciliationAccount = { type: 'bank', id: scoped('sgd-bank'), name: 'SGD bank', currency: 'SGD' };
    await setDoc(doc(db, 'banks', account.id), { userId: uid, name: account.name, balance: 100, currency: 'SGD' });
    const key = 'expense_manager_currency_rate_2026-03-02:MYR:SGD';
    const rate = { fromCurrency: 'MYR', toCurrency: 'SGD', rate: 0.3, rateDate: '2026-03-02', fetchedAt: new Date().toISOString(), provider: 'synthetic-original' };
    localStorage.setItem(key, JSON.stringify(rate));
    const id = scoped('usd-sgd');
    await actualExpenseService.create({ ...makeExpense('usd-sgd'), id, bankId: account.id, amount: 10, currency: 'USD', baseAmount: 45, baseCurrency: 'MYR', date: '2026-03-02' }, { updateAccountBalances: true }, operation('usd-sgd-create'));
    expect((await getDocFromServer(doc(db, 'banks', account.id))).data()!.balance).toBe(86.5);
    const before = await readReconciliationReport(uid, account, '2026-03-02', '2026-03-02');
    expect(before.movements[0].deltaMinor).toBe(-1350);
    localStorage.setItem(key, JSON.stringify({ ...rate, rate: 0.99, provider: 'synthetic-later' }));
    await actualExpenseService.update(id, { notes: 'Description-only edit' }, operation('usd-sgd-note'));
    const after = await readReconciliationReport(uid, account, '2026-03-02', '2026-03-02');
    expect(after.sourceFingerprint).toBe(before.sourceFingerprint);
    expect(after.movements[0].deltaMinor).toBe(-1350);
    expect((await getDocFromServer(doc(db, 'banks', account.id))).data()!.balance).toBe(86.5);
  });
  it('reads all 1005 repayments for one expense using stable scoped cursor pages', async () => {
    const expenseId = scoped('many-repayments');
    await actualExpenseService.create({ ...makeExpense('many-repayments'), id: expenseId, paymentMethod: 'cash' });
    for (let start = 0; start < 1005; start += 400) {
      const batch = writeBatch(db);
      for (let index = start; index < Math.min(1005, start + 400); index++) batch.set(doc(db, 'repayments', scoped(`scoped-repayment-${index}`)), { userId: uid, expenseId, amount: 1, currency: 'JPY', date: '2026-01-02', paymentMethod: 'cash' });
      await batch.commit();
    }
    const rows = await readExpenseRepayments(uid, expenseId);
    expect(rows).toHaveLength(1005); expect(new Set(rows.map((row) => row.id)).size).toBe(1005);
    expect(rows.every((row) => row.expenseId === expenseId && row.userId === uid)).toBe(true);
  }, 30000);
});

describe('legacy and modern repayment posting provenance', () => {
  it('does not invent bank/wallet movements for legacy creation, editing or deletion and protects posting fields', async () => {
    const expenseId = scoped('posting-expense');
    await actualExpenseService.create({ ...makeExpense('posting-expense'), id: expenseId, paymentMethod: 'cash' });
    const walletId = scoped('legacy-wallet');
    await setDoc(doc(db, 'ewallets', walletId), { userId: uid, name: 'Legacy wallet', currency: 'MYR', balance: 500 });
    for (const method of ['bank', 'e_wallet'] as const) {
      const id = scoped(`legacy-${method}-posting`);
      const payload = { id, userId: uid, expenseId, amount: 20, currency: 'MYR', baseAmount: 20, baseCurrency: 'MYR', date: '2026-01-04', paymentMethod: method, ...(method === 'bank' ? { bankId } : { paymentMethodName: 'Legacy wallet' }) };
      await setDoc(doc(db, 'repayments', id), payload);
      await expect(setDoc(doc(db, 'repayments', id), { balanceApplied: true }, { merge: true })).rejects.toThrow();
      await expect(setDoc(doc(db, 'repayments', id), { bookedAccountMovements: [{ role: 'income', accountType: method, accountId: method === 'bank' ? bankId : walletId, currency: 'MYR', amountMinor: 2000, source: 'forged' }] }, { merge: true })).rejects.toThrow();
      const account: ReconciliationAccount = { type: method, id: method === 'bank' ? bankId : walletId, name: method === 'bank' ? 'Test bank' : 'Legacy wallet', currency: 'MYR' };
      let report = await readReconciliationReport(uid, account, '2026-01-04', '2026-01-04');
      expect(report.movements).toHaveLength(1); expect(report.movements[0]).toMatchObject({ deltaMinor: 0, reviewReason: 'legacy-unposted-repayment' });
      const baseline = (await getDocFromServer(doc(db, method === 'bank' ? 'banks' : 'ewallets', account.id))).data()!.balance;
      await commitQueuedEntity({ id: `legacy-${method}-edit-proof`, entity: 'repayment', type: 'update', payload: { ...payload, amount: 30, baseAmount: 30 }, timestamp: Date.now(), retryCount: 0 });
      report = await readReconciliationReport(uid, account, '2026-01-04', '2026-01-04');
      expect(report.movements[0]).toMatchObject({ deltaMinor: 0, reviewAmountMinor: 3000 });
      await commitQueuedEntity({ id: `legacy-${method}-delete-proof`, entity: 'repayment', type: 'delete', payload: { id, userId: uid, expenseId }, timestamp: Date.now(), retryCount: 0 });
      expect((await getDocFromServer(doc(db, method === 'bank' ? 'banks' : 'ewallets', account.id))).data()!.balance).toBe(baseline);
      expect((await readReconciliationReport(uid, account, '2026-01-04', '2026-01-04')).movements).toHaveLength(0);
    }
  });
  it('requires a fresh coupled proof for modern unassigned repayment updates/deletes', async () => {
    const expenseId = scoped('modern-posting-expense');
    await actualExpenseService.create({ ...makeExpense('modern-posting-expense'), id: expenseId, paymentMethod: 'cash' });
    const id = scoped('modern-unassigned'); const payload = { id, userId: uid, expenseId, amount: 20, currency: 'MYR', baseAmount: 20, baseCurrency: 'MYR', date: '2026-01-05', paymentMethod: 'bank', bankId };
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    await commitQueuedEntity({ id: 'modern-unassigned-create', entity: 'repayment', type: 'create', payload, timestamp: Date.now(), retryCount: 0 });
    await expect(setDoc(doc(db, 'repayments', id), { balanceApplied: false }, { merge: true })).rejects.toThrow();
    await expect(setDoc(doc(db, 'repayments', id), { bookedAccountMovements: [] }, { merge: true })).rejects.toThrow();
    await expect(setDoc(doc(db, 'repayments', id), { amount: 30 }, { merge: true })).rejects.toThrow();
    await expect(deleteDoc(doc(db, 'repayments', id))).rejects.toThrow();
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline + 20);
    await commitQueuedEntity({ id: 'modern-unassigned-delete', entity: 'repayment', type: 'delete', payload: { id, userId: uid, expenseId }, timestamp: Date.now(), retryCount: 0 });
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline);
  });
});

describe('repayment proofs require actual account deltas', () => {
  it.each([false, true])('rejects a forged receipt/proof/payment batch without its bank movement (split=%s)', async (split) => {
    const expenseId = scoped(`forged-parent-${split}`); const id = scoped(`forged-posting-${split}`); const operationId = `forged-posting-op-${split}`;
    const expense = { ...makeExpense('forged'), id: expenseId, paymentMethod: 'cash' as const, ...(split ? { splitParticipants: [{ id: 'a', name: 'A', owedMinor: 4000 }] } : {}) };
    await actualExpenseService.create(expense);
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    const batch = writeBatch(db);
    batch.set(doc(db, 'repayments', id), { userId: uid, expenseId, amount: 20, currency: 'MYR', baseAmount: 20, baseCurrency: 'MYR', date: '2026-01-06', paymentMethod: 'bank', bankId, balanceApplied: true,
      bookedAccountMovements: [{ role: 'income', accountType: 'bank', accountId: bankId, currency: 'MYR', amountMinor: 2000, source: 'forged' }],
      ...(split ? { splitParticipantId: 'a', settledExpenseMinor: 2000, settledExpenseCurrency: 'MYR' } : {}) });
    batch.set(doc(db, 'repaymentPostingProofs', id), { userId: uid, expenseId, operationId, beforeApplied: false, afterApplied: true, updatedAt: serverTimestamp() });
    batch.set(doc(db, 'mutationReceipts', uid, 'operations', operationId), { userId: uid, result: null, committedAt: serverTimestamp() });
    if (split) batch.update(doc(db, 'expenses', expenseId), { splitPaidMinor: { a: 2000 }, splitSettlement: { repaymentId: id, operationId, beforeId: '', beforeMinor: 0, afterId: 'a', afterMinor: 2000, afterIndex: 0 }, updatedAt: serverTimestamp() });
    await expect(batch.commit()).rejects.toThrow();
    expect((await getDocFromServer(doc(db, 'repayments', id))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'repaymentPostingProofs', id))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'mutationReceipts', uid, 'operations', operationId))).exists()).toBe(false);
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline);
  });
  it('permits a real two-account split repayment edit and reversal within rule access limits', async () => {
    const expenseId = scoped('two-account-split'); const id = scoped('two-account-repayment'); const walletId = scoped('two-account-wallet');
    await setDoc(doc(db, 'ewallets', walletId), { userId: uid, name: 'Proof wallet', currency: 'MYR', balance: 500 });
    await actualExpenseService.create({ ...makeExpense('two-account'), id: expenseId, paymentMethod: 'cash', splitParticipants: [{ id: 'a', name: 'A', owedMinor: 4000 }] });
    const payload = { id, userId: uid, expenseId, amount: 20, currency: 'MYR', baseAmount: 20, baseCurrency: 'MYR', date: '2026-01-07', paymentMethod: 'bank', bankId, splitParticipantId: 'a', settledExpenseMinor: 2000, settledExpenseCurrency: 'MYR' };
    const baseline = (await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance;
    const operation = { id: 'two-account-create', entity: 'repayment' as const, type: 'create' as const, payload, timestamp: Date.now(), retryCount: 0 };
    await commitQueuedEntity(operation);
    await commitQueuedEntity({ ...operation, id: 'two-account-edit', type: 'update', payload: { ...payload, paymentMethod: 'e_wallet', paymentMethodName: 'Proof wallet', bankId: undefined } });
    expect((await getDocFromServer(doc(db, 'banks', bankId))).data()!.balance).toBe(baseline);
    expect((await getDocFromServer(doc(db, 'ewallets', walletId))).data()!.balance).toBe(520);
    await commitQueuedEntity({ ...operation, id: 'two-account-delete', type: 'delete', payload: { id, userId: uid, expenseId } as typeof payload });
    expect((await getDocFromServer(doc(db, 'ewallets', walletId))).data()!.balance).toBe(500);
  });
});
