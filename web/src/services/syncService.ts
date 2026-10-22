import { commitQueuedEntity } from './queuedEntityMutation';
/**
 * Sync Service
 * Handles background synchronization of offline data with Firestore
 */

import { expenseService } from './expenseService';
import { categoryService } from './categoryService';
import { budgetService } from './budgetService';
import { recurringExpenseService } from './recurringExpenseService';
import { incomeService } from './incomeService';
import { cardService } from './cardService';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';
import { repaymentService } from './repaymentService';
import { auth } from '../config/firebase';
import { offlineQueue, QueuedOperation } from '../utils/offlineQueue';
import { networkStatus } from '../utils/networkStatus';
import { sessionCache, CacheableEntity } from '../utils/sessionCache';
import { withBudgetMutationLock } from '../utils/budgetMutationLock';
import { scheduledPaymentService } from './scheduledPaymentService';
import { transferService } from './transferService';
import { featureSettingsService } from './featureSettingsService';
import { userSettingsService } from './userSettingsService';
import { dashboardLayoutService } from './dashboardLayoutService';
import { isRetryableWriteError } from '../utils/localFirstMutation';
import { onAuthStateChanged } from 'firebase/auth';
import { friendSpendingService } from './friendSpendingService';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentOperation?: string;
  budgetRejections?: number;
}

type SyncProgressCallback = (progress: SyncProgress) => void;
type SyncPayload = Record<string, unknown>;

const asSyncPayload = (value: unknown): SyncPayload | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as SyncPayload
    : null;

class SyncService {
  private isSyncing = false;
  private syncCallbacks: Set<SyncProgressCallback> = new Set();
  private autoSyncEnabled = true;
  private queueSyncTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('offline-queue-changed', () => {
      this.scheduleNextSync();
    });
    if (auth) onAuthStateChanged(auth, () => this.scheduleNextSync());
    // Subscribe to network status changes
    networkStatus.subscribe((isOnline) => {
      if (isOnline && this.autoSyncEnabled) {
        // Delay sync slightly to ensure connection is stable
        setTimeout(() => {
          void this.syncOfflineQueue().catch(console.error);
        }, 1000);
      }
    });
  }

  /**
   * Subscribe to sync progress updates
   */
  onSyncProgress(callback: SyncProgressCallback): () => void {
    this.syncCallbacks.add(callback);
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Notify all sync progress listeners
   */
  private notifyProgress(progress: SyncProgress) {
    this.syncCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in sync progress callback:', error);
      }
    });
  }

  private notifyBudgetOperationRejected(operation: QueuedOperation) {
    if (operation.entity !== 'budget' || typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    window.dispatchEvent(new CustomEvent('budget-offline-operation-rejected', {
      detail: {
        userId: payload?.userId || auth.currentUser?.uid,
        operationType: operation.type,
        budgetId: payload?.id,
        previousBudget: payload?.previousBudget,
      },
    }));
  }

  private notifyExpenseOperationNeedsAttention(operation: QueuedOperation) {
    if (operation.entity !== 'expense' || typeof window === 'undefined') return;
    const payload = operation.payload as { userId?: unknown };
    window.dispatchEvent(new CustomEvent('expense-offline-operation-needs-attention', {
      detail: { operationId: operation.id, userId: payload?.userId },
    }));
  }

  private notifyOperationNeedsAttention(operation: QueuedOperation) {
    if (operation.entity === 'expense' || operation.entity === 'budget' || typeof window === 'undefined') return;
    const payload = operation.payload as { userId?: unknown } | null;
    window.dispatchEvent(new CustomEvent('offline-operation-needs-attention', {
      detail: { operationId: operation.id, userId: payload?.userId, entity: operation.entity },
    }));
  }

  /**
   * Enable/disable automatic sync when connection is restored
   */
  setAutoSync(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    clearTimeout(this.queueSyncTimer);
    if (enabled) this.scheduleNextSync();
  }

  /**
   * Check if sync is currently in progress
   */
  get isSyncInProgress(): boolean {
    const uid = auth.currentUser?.uid;
    return !!uid && (this.isSyncing || offlineQueue.getAll().some((row) => (row.payload as { userId?: unknown })?.userId === uid && !!row.lease && row.lease.expiresAt > Date.now()));
  }

  /**
   * Get pending operations count
   */
  get pendingCount(): number {
    return auth.currentUser?.uid ? offlineQueue.count(auth.currentUser.uid) : 0;
  }

  /**
   * Sync offline queue with server
   */
  async syncOfflineQueue(): Promise<{ success: number; failed: number }> {
    const userId = auth.currentUser?.uid;
    if (this.isSyncing || !networkStatus.isOnline || !userId) return { success: 0, failed: 0 };
    this.isSyncing = true;
    let success = 0;
    let failed = 0;
    const synchronized: QueuedOperation[] = [];
    try {
      await offlineQueue.initialize();
      await offlineQueue.refresh();
      const drain = async () => {
        const total = offlineQueue.getAll().filter((row) => (row.payload as { userId?: unknown })?.userId === userId).length;
        this.notifyProgress({ total, completed: 0, failed: 0, currentOperation: 'Starting sync...' });
        while (networkStatus.isOnline && auth.currentUser?.uid === userId) {
          const operation = await offlineQueue.claimNext(userId);
          if (!operation?.lease) break;
          const token = operation.lease.token;
          let leaseLost = false;
          const heartbeat = setInterval(() => {
            void offlineQueue.renew(operation.id, token).then((owned) => { if (!owned) leaseLost = true; })
              .catch(() => { leaseLost = true; });
          }, 15_000);
          this.notifyProgress({ total, completed: success, failed, currentOperation: `Syncing ${operation.entity} (${operation.type})...` });
          try {
            const result = await this.executeOperation(operation);
            if (!result) throw Object.assign(new Error('Unsupported or invalid queued operation'), { code: 'invalid-argument' });
            if (!leaseLost && await offlineQueue.complete(operation.id, token)) {
              success++;
              synchronized.push(operation);
            }
          } catch (error) {
            const code = error && typeof error === 'object' && 'code' in error ? String(error.code).split('/').pop() : '';
            if (!networkStatus.isOnline || auth.currentUser?.uid !== userId || code === 'unauthenticated') {
              await offlineQueue.release(operation.id, token, code === 'unauthenticated' ? 30_000 : 0);
              break;
            }
            const retrying = await offlineQueue.fail(operation.id, token, error, isRetryableWriteError(error));
            if (retrying === false) {
              failed++;
              const retained = offlineQueue.getAll().find((row) => row.id === operation.id);
              if (retained?.status === 'needs-attention') {
                this.notifyExpenseOperationNeedsAttention(retained);
                this.notifyOperationNeedsAttention(retained);
                if (retained.entity === 'budget') this.notifyBudgetOperationRejected(retained);
              }
            }
          } finally {
            clearInterval(heartbeat);
          }
        }
      };
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request(`expense-outbox-sync:${userId}`, { ifAvailable: true }, async (lock) => { if (lock) await drain(); });
      } else {
        // Atomic per-operation leases also coordinate browsers without Web Locks.
        await drain();
      }
    } finally {
      this.isSyncing = false;
      offlineQueue.notifyCompleted(synchronized);
      this.notifyProgress({ total: offlineQueue.count(userId), completed: success, failed, currentOperation: 'Sync complete' });
      this.scheduleNextSync();
    }
    return { success, failed };
  }

  private scheduleNextSync(): void {
    clearTimeout(this.queueSyncTimer);
    const userId = auth.currentUser?.uid;
    if (!userId || !this.autoSyncEnabled || !networkStatus.isOnline || this.isSyncing) return;
    const next = offlineQueue.nextWakeAt(userId);
    if (next !== undefined) this.queueSyncTimer = setTimeout(() => {
      void this.syncOfflineQueue().catch((error) => console.error('Background synchronization failed:', error));
    }, Math.min(2_147_483_647, Math.max(250, next - Date.now())));
  }

  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    switch (operation.entity) {
        case 'expense':
          return await this.executeExpenseOperation(operation);
        case 'category':
          await commitQueuedEntity(operation);
          return true;
        case 'budget':
          return await this.executeBudgetOperation(operation);
        case 'recurring':
          await commitQueuedEntity(operation);
          return true;
        case 'scheduledPayment':
          await commitQueuedEntity(operation);
          return true;
        case 'scheduledPaymentRecord':
          return await this.executeScheduledPaymentRecordOperation(operation);
        case 'income':
          return await this.executeIncomeOperation(operation);
        case 'card':
          await commitQueuedEntity(operation);
          return true;
        case 'bank':
          await commitQueuedEntity(operation);
          return true;
        case 'ewallet':
          await commitQueuedEntity(operation);
          return true;
        case 'repayment':
          await commitQueuedEntity(operation);
          return true;
        case 'transfer':
          return await this.executeTransferOperation(operation);
        case 'featureSettings':
          return await this.executeFeatureSettingsOperation(operation);
        case 'quickExpensePreset':
          await commitQueuedEntity(operation);
          return true;
        case 'userSettings':
          return await this.executeUserSettingsOperation(operation);
        case 'dashboardLayout':
          return await this.executeDashboardLayoutOperation(operation);
        case 'friendPreference': {
          const payload = asSyncPayload(operation.payload);
          if (operation.type !== 'update' || payload?.userId !== auth.currentUser?.uid ||
              typeof payload?.userId !== 'string' || typeof payload.id !== 'string' || !asSyncPayload(payload.preference)) return false;
          await friendSpendingService.savePreference(payload.userId, payload.id,
            payload.preference as Parameters<typeof friendSpendingService.savePreference>[2], { userId: payload.userId, operationId: operation.id });
          return true;
        }
        default:
          console.warn('Unknown entity type:', operation.entity);
          return false;
      }
  }

  private async executeExpenseOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || typeof payload?.userId !== 'string' || payload.userId !== signedInUserId) return false;
    if (typeof payload.id !== 'string' || !payload.id) return false;
    
    switch (operation.type) {
      case 'create':
        await expenseService.create(
          { ...payload, id: payload.id, userId: signedInUserId },
          { updateAccountBalances: true },
          { userId: signedInUserId, operationId: operation.id },
        );
        return true;
      case 'update':
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await expenseService.update(payload.id, updates, { userId: signedInUserId, operationId: operation.id });
        }
        return true;
      case 'delete':
        await expenseService.deleteWithRelatedTransfers(
          payload.id,
          signedInUserId,
          Array.isArray(payload.relatedTransferIds)
            ? payload.relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
            : [],
          { userId: signedInUserId, operationId: operation.id },
        );
        return true;
      default:
        return false;
    }
  }

  private async executeBudgetOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;

    return withBudgetMutationLock(async () => {
      const signedInUserId = auth.currentUser?.uid;
      if (!signedInUserId || typeof payload.userId !== 'string' || payload.userId !== signedInUserId) return false;

      switch (operation.type) {
        case 'delete':
          if (!payload.id) return false;
          await budgetService.delete(payload.id, { userId: signedInUserId, operationId: operation.id });
          return true;
        case 'create':
          await budgetService.create({ ...payload, userId: signedInUserId }, { userId: signedInUserId, operationId: operation.id });
          return true;
        case 'update': {
          if (!payload.id) return false;
          const updates = { ...payload };
          delete updates.previousBudget;
          await budgetService.update(payload.id, { ...updates, userId: signedInUserId }, { userId: signedInUserId, operationId: operation.id });
          return true;
        }
        default:
          return false;
      }
    });
  }

  private async executeScheduledPaymentRecordOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId || typeof payload.id !== 'string') return false;
    if (operation.type === 'delete') {
      await scheduledPaymentService.deletePaymentRecord(payload.id, { userId: signedInUserId, operationId: operation.id });
      return true;
    }
    if (operation.type === 'update') {
      await scheduledPaymentService.updatePaymentRecord(payload.id, payload, { userId: signedInUserId, operationId: operation.id });
      return true;
    }
    if (operation.type === 'create') {
      const { generatedExpensePayload, ...recordFields } = payload;
      const expensePayload = generatedExpensePayload ? asSyncPayload(generatedExpensePayload) : undefined;
      if (generatedExpensePayload && (!expensePayload || expensePayload.userId !== signedInUserId || typeof expensePayload.id !== 'string')) return false;
      await scheduledPaymentService.createPaymentRecord(
        recordFields as Parameters<typeof scheduledPaymentService.createPaymentRecord>[0],
        expensePayload as Parameters<typeof scheduledPaymentService.createPaymentRecord>[1],
        { userId: signedInUserId, operationId: operation.id },
      );
      return true;
    }
    return false;
  }

  private async executeIncomeOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await incomeService.create(payload, { userId: signedInUserId, operationId: operation.id });
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await incomeService.update(payload.id, updates, { userId: signedInUserId, operationId: operation.id });
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await incomeService.delete(payload.id, signedInUserId, { userId: signedInUserId, operationId: operation.id });
        return true;
      default:
        return false;
    }
  }

  private async executeTransferOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId || typeof payload.id !== 'string') return false;

    switch (operation.type) {
      case 'create':
        await transferService.create(payload as Parameters<typeof transferService.create>[0], { userId: signedInUserId, operationId: operation.id });
        return true;
      case 'update': {
        const updates = { ...payload };
        delete updates.id;
        delete updates.userId;
        await transferService.update(payload.id, updates as Parameters<typeof transferService.update>[1], { userId: signedInUserId, operationId: operation.id });
        return true;
      }
      case 'delete':
        await transferService.deleteWithBalanceReversal(payload.id, signedInUserId, { userId: signedInUserId, operationId: operation.id });
        return true;
      default:
        return false;
    }
  }

  private async executeFeatureSettingsOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    if (operation.type !== 'update') return false;
    if (payload.reset === true) {
      await featureSettingsService.resetToDefaults(signedInUserId, { userId: signedInUserId, operationId: operation.id });
      return true;
    }
    await featureSettingsService.update(
      signedInUserId,
      Array.isArray(payload.enabledFeatures)
        ? payload.enabledFeatures as Parameters<typeof featureSettingsService.update>[1]
        : [],
      Array.isArray(payload.tabFeatures)
        ? payload.tabFeatures as NonNullable<Parameters<typeof featureSettingsService.update>[2]>
        : undefined,
      Array.isArray(payload.hamburgerFeatures)
        ? payload.hamburgerFeatures as NonNullable<Parameters<typeof featureSettingsService.update>[3]>
        : undefined,
      { userId: signedInUserId, operationId: operation.id },
    );
    return true;
  }

  private async executeUserSettingsOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as { userId?: unknown; updates?: unknown; incomeLinkedBudgetChange?: { config: import('../types').IncomeLinkedBudgetSettings; manualMonthlyLimit?: number }; overallBudgetLimit?: { period?: unknown; amount?: unknown } } | null;
    const signedInUserId = auth.currentUser?.uid;
    if (operation.type !== 'update' || !signedInUserId || payload?.userId !== signedInUserId ||
        !payload.updates || typeof payload.updates !== 'object' || Array.isArray(payload.updates)) return false;
    await userSettingsService.getOrCreate(signedInUserId);
    const identity = { userId: signedInUserId, operationId: operation.id };
    if (payload.incomeLinkedBudgetChange) {
      const { config, manualMonthlyLimit } = payload.incomeLinkedBudgetChange;
      await userSettingsService.setIncomeLinkedBudget(signedInUserId, config, manualMonthlyLimit, identity);
    } else if (payload.overallBudgetLimit) {
      const { period, amount } = payload.overallBudgetLimit;
      if (!['weekly', 'monthly', 'yearly'].includes(String(period)) || (amount !== undefined && typeof amount !== 'number')) return false;
      await userSettingsService.setOverallBudgetLimit(signedInUserId, period as import('../types').BudgetPeriod, amount as number | undefined, identity);
    } else await userSettingsService.update(signedInUserId, payload.updates as Record<string, unknown>, identity);
    return true;
  }

  private async executeDashboardLayoutOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as { userId?: unknown; widgets?: unknown } | null;
    const signedInUserId = auth.currentUser?.uid;
    if (operation.type !== 'update' || !signedInUserId || payload?.userId !== signedInUserId || !Array.isArray(payload.widgets)) return false;
    await dashboardLayoutService.updateWidgets(signedInUserId, payload.widgets as import('../types/dashboard').DashboardWidget[], { userId: signedInUserId, operationId: operation.id });
    return true;
  }

  /**
   * Refresh cache for a specific entity
   */
  async refreshCache(entity: CacheableEntity, userId: string): Promise<void> {
    if (!networkStatus.isOnline) {
      console.log('Cannot refresh cache while offline');
      return;
    }

    try {
      let data: unknown;

      switch (entity) {
        case 'expenses':
          data = await expenseService.getAll(userId);
          break;
        case 'categories':
          data = await categoryService.getAll(userId);
          break;
        case 'budgets':
          data = await budgetService.getAll(userId);
          break;
        case 'recurring':
          data = await recurringExpenseService.getAll(userId);
          break;
        case 'incomes':
          data = await incomeService.getAll(userId);
          break;
        case 'cards':
          data = await cardService.getAll(userId);
          break;
        case 'banks':
          data = await bankService.getAll(userId);
          break;
        case 'ewallets':
          data = await ewalletService.getAll(userId);
          break;
        case 'repayments':
          data = await repaymentService.getAll(userId);
          break;
        case 'featureSettings':
          // Feature settings handled separately as they need special initialization
          console.log('Feature settings not cached via refreshCache');
          return;
        case 'userSettings':
          // User settings handled separately
          console.log('User settings not cached via refreshCache');
          return;
        default:
          console.warn('Unknown entity type for cache refresh:', entity);
          return;
      }

      sessionCache.set(entity, userId, data);
    } catch (error) {
      console.error(`Error refreshing cache for ${entity}:`, error);
      throw error;
    }
  }

  /**
   * Refresh all caches for a user
   */
  async refreshAllCaches(userId: string): Promise<void> {
    const { SYNCABLE_ENTITIES } = await import('../constants/cacheEntities');

    const promises = SYNCABLE_ENTITIES.map((entity) => 
      this.refreshCache(entity, userId).catch((error) => {
        console.error(`Failed to refresh cache for ${entity}:`, error);
      })
    );

    await Promise.all(promises);
  }
}

// Export singleton instance
export const syncService = new SyncService();
