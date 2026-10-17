import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncService } from './syncService';
import { offlineQueue, type QueuedOperation } from '../utils/offlineQueue';
import { writeLocalFirst } from '../utils/localFirstMutation';
import { expenseService } from './expenseService';
import { incomeService } from './incomeService';
import { categoryService } from './categoryService';
import { budgetService } from './budgetService';
import { recurringExpenseService } from './recurringExpenseService';
import { cardService } from './cardService';
import { bankService } from './bankService';
import { ewalletService } from './ewalletService';
import { repaymentService } from './repaymentService';
import { transferService } from './transferService';
import { scheduledPaymentService } from './scheduledPaymentService';
import { quickExpenseService } from './quickExpenseService';
import { featureSettingsService } from './featureSettingsService';
import { userSettingsService } from './userSettingsService';
import { dashboardLayoutService } from './dashboardLayoutService';
import { friendSpendingService } from './friendSpendingService';

vi.mock('../config/firebase', () => ({ auth: { currentUser: { uid: 'user' } } }));
vi.mock('../utils/networkStatus', () => ({ networkStatus: { isOnline: true, subscribe: vi.fn() } }));
vi.mock('./expenseService', () => ({ expenseService: { create: vi.fn(), update: vi.fn(), deleteWithRelatedTransfers: vi.fn() } }));
vi.mock('./incomeService', () => ({ incomeService: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('./categoryService', () => ({ categoryService: { create: vi.fn() } }));
vi.mock('./budgetService', () => ({ budgetService: { create: vi.fn() } }));
vi.mock('./recurringExpenseService', () => ({ recurringExpenseService: { create: vi.fn() } }));
vi.mock('./cardService', () => ({ cardService: { create: vi.fn() } }));
vi.mock('./bankService', () => ({ bankService: { create: vi.fn() } }));
vi.mock('./ewalletService', () => ({ ewalletService: { create: vi.fn() } }));
vi.mock('./repaymentService', () => ({ repaymentService: { create: vi.fn() } }));
vi.mock('./transferService', () => ({ transferService: { create: vi.fn() } }));
vi.mock('./scheduledPaymentService', () => ({ scheduledPaymentService: { create: vi.fn(), createPaymentRecord: vi.fn() } }));
vi.mock('./quickExpenseService', () => ({ quickExpenseService: { create: vi.fn() } }));
vi.mock('./featureSettingsService', () => ({ featureSettingsService: { update: vi.fn() } }));
vi.mock('./userSettingsService', () => ({ userSettingsService: { getOrCreate: vi.fn(), update: vi.fn() } }));
vi.mock('./dashboardLayoutService', () => ({ dashboardLayoutService: { updateWidgets: vi.fn() } }));
vi.mock('./friendSpendingService', () => ({ friendSpendingService: { savePreference: vi.fn() } }));

beforeEach(() => {
  syncService.setAutoSync(false);
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

const routes = [
  ['expense', expenseService.create], ['income', incomeService.create], ['category', categoryService.create],
  ['budget', budgetService.create], ['recurring', recurringExpenseService.create], ['card', cardService.create],
  ['bank', bankService.create], ['ewallet', ewalletService.create], ['repayment', repaymentService.create],
  ['transfer', transferService.create], ['scheduledPayment', scheduledPaymentService.create],
  ['scheduledPaymentRecord', scheduledPaymentService.createPaymentRecord], ['quickExpensePreset', quickExpenseService.create],
  ['featureSettings', featureSettingsService.update], ['userSettings', userSettingsService.update],
  ['dashboardLayout', dashboardLayoutService.updateWidgets], ['friendPreference', friendSpendingService.savePreference],
] as const;

describe('outbox replay coverage', () => {
  it.each(routes)('replays %s through its domain service', async (entity, target) => {
    const singleton = ['featureSettings', 'userSettings', 'dashboardLayout', 'friendPreference'].includes(entity);
    offlineQueue.enqueue({ entity, type: singleton ? 'update' : 'create', payload: {
      id: 'doc', userId: 'user', enabledFeatures: [], updates: { timeFormat: '12h' }, widgets: [], preference: { mode: 'total' },
    } });
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 1, failed: 0 });
    expect(target).toHaveBeenCalledTimes(1);
    expect(offlineQueue.count()).toBe(0);
  });

  it('does not run update/delete ahead of a failed create', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(incomeService.create).mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'unavailable' }));
    for (const type of ['create', 'update', 'delete'] as const) offlineQueue.enqueue({ type, entity: 'income', payload: { id: 'income', userId: 'user' } });
    await syncService.syncOfflineQueue();
    expect(incomeService.update).not.toHaveBeenCalled();
    expect(incomeService.delete).not.toHaveBeenCalled();
    expect(offlineQueue.getAll().map((operation) => operation.retryCount)).toEqual([1, 0, 0]);
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 3, failed: 0 });
    expect(incomeService.update).toHaveBeenCalledTimes(1);
    expect(incomeService.delete).toHaveBeenCalledTimes(1);
  });

  it('waits for an active direct write instead of executing its durable copy twice', async () => {
    let finish!: () => void;
    const direct = writeLocalFirst({ type: 'create', entity: 'bank', payload: { id: 'bank', userId: 'user' } },
      () => new Promise<void>((resolve) => { finish = resolve; }));
    offlineQueue.enqueue({ type: 'create', entity: 'income', payload: { id: 'income', userId: 'user', bankId: 'bank' } });
    await syncService.syncOfflineQueue();
    expect(bankService.create).not.toHaveBeenCalled();
    expect(incomeService.create).not.toHaveBeenCalled();
    finish();
    await direct;
    await syncService.syncOfflineQueue();
    expect(incomeService.create).toHaveBeenCalledTimes(1);
  });

  it('retains another account’s writes and blocks dependents of a needs-attention item', async () => {
    const operations: QueuedOperation[] = [
      { id: 'foreign', type: 'create', entity: 'income', payload: { id: 'foreign', userId: 'other' }, retryCount: 0, timestamp: 1 },
      { id: 'attention', type: 'create', entity: 'bank', payload: { id: 'bank', userId: 'user' }, status: 'needs-attention', retryCount: 3, timestamp: 2 },
      { id: 'dependent', type: 'create', entity: 'income', payload: { id: 'income', userId: 'user' }, retryCount: 0, timestamp: 3 },
    ];
    offlineQueue.save(operations);
    await syncService.syncOfflineQueue();
    expect(incomeService.create).not.toHaveBeenCalled();
    expect(offlineQueue.getAll()).toEqual(operations);
    offlineQueue.retry('attention');
    expect(await syncService.syncOfflineQueue()).toEqual({ success: 2, failed: 0 });
    expect(offlineQueue.getAll().map((operation) => operation.id)).toEqual(['foreign']);
  });
});
