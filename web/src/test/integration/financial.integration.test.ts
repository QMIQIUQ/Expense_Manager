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
