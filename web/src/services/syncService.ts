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
import { quickExpenseService } from './quickExpenseService';
import { userSettingsService } from './userSettingsService';
import { dashboardLayoutService } from './dashboardLayoutService';
import { isLocalWriteActive } from '../utils/localFirstMutation';
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
      if (this.isSyncing || !this.autoSyncEnabled || !networkStatus.isOnline) return;
      clearTimeout(this.queueSyncTimer);
      this.queueSyncTimer = setTimeout(() => { void this.syncOfflineQueue(); }, 250);
    });
    // Subscribe to network status changes
    networkStatus.subscribe((isOnline) => {
      if (isOnline && this.autoSyncEnabled) {
        // Delay sync slightly to ensure connection is stable
        setTimeout(() => {
          this.syncOfflineQueue();
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
  }

  /**
   * Check if sync is currently in progress
   */
  get isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get pending operations count
   */
  get pendingCount(): number {
    return offlineQueue.count();
  }

  /**
   * Sync offline queue with server
   */
  async syncOfflineQueue(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return { success: 0, failed: 0 };
    }

    if (!networkStatus.isOnline) {
      console.log('Device is offline, cannot sync');
      return { success: 0, failed: 0 };
    }

    const queue = offlineQueue.getAll();
    if (queue.length === 0) {
      console.log('No pending operations to sync');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let success = 0;
    let failed = 0;
    const rejectedBudgetOperations: QueuedOperation[] = [];
    const blockedBudgetKeys = new Set<string>();
    const blockedExpenseKeys = new Set<string>();
    const blockedUsers = new Set<string>();

    this.notifyProgress({
      total: queue.length,
      completed: 0,
      failed: 0,
      currentOperation: 'Starting sync...',
    });

    for (let i = 0; i < queue.length; i++) {
      const operation = queue[i];

      // A prior terminal create rejection may have removed this dependent write.
      if (!offlineQueue.getAll().some((queuedOperation) => queuedOperation.id === operation.id)) continue;
      const owner = (operation.payload as { userId?: unknown } | null)?.userId;
      if (typeof owner !== 'string' || owner !== auth.currentUser?.uid || blockedUsers.has(owner)) continue;
      if (isLocalWriteActive(operation.id) || operation.status === 'needs-attention') {
        blockedUsers.add(owner);
        continue;
      }

      let expenseKey: string | undefined;
      if (operation.entity === 'expense') {
        const payload = operation.payload as { id?: unknown; userId?: unknown } | null;
        const signedInUserId = auth.currentUser?.uid;
        // Leave legacy and other-account entries untouched without consuming retries.
        if (!signedInUserId || !payload || typeof payload.userId !== 'string' || payload.userId !== signedInUserId) continue;

        if (operation.type === 'create' && (typeof payload.id !== 'string' || !payload.id)) {
          const updatedPayload = { ...payload, id: expenseService.createId() };
          if (!offlineQueue.updatePayload(operation.id, updatedPayload)) continue;
          operation.payload = updatedPayload;
          payload.id = updatedPayload.id;
        }
        if (typeof payload.id !== 'string' || !payload.id) continue;

        expenseKey = `${signedInUserId}:${payload.id}`;
        if (blockedExpenseKeys.has(expenseKey)) continue;
        if (operation.status === 'needs-attention') {
          blockedExpenseKeys.add(expenseKey);
          continue;
        }
      } else if (operation.status === 'needs-attention') {
        continue;
      }

      if (operation.entity !== 'expense' && operation.entity !== 'budget') {
        const payload = operation.payload as { userId?: unknown } | null;
        const signedInUserId = auth.currentUser?.uid;
        // Do not consume another account's or a legacy malformed operation's retries.
        if (!signedInUserId || !payload || payload.userId !== signedInUserId) continue;
      }

      let budgetKey: string | undefined;
      if (operation.entity === 'budget') {
        const payload = operation.payload as { id?: unknown; userId?: unknown };
        const signedInUserId = auth.currentUser?.uid;
        // Leave legacy and other-account operations queued without consuming retries.
        if (!signedInUserId || typeof payload?.userId !== 'string' || payload.userId !== signedInUserId) continue;
        if (typeof payload.id === 'string') {
          budgetKey = `${payload.userId}:${payload.id}`;
          if (blockedBudgetKeys.has(budgetKey)) continue;
        }
      }
      
      this.notifyProgress({
        total: queue.length,
        completed: success,
        failed,
        currentOperation: `Syncing ${operation.entity} (${operation.type})...`,
      });

      try {
        const result = await this.executeOperation(operation);
        if (result) {
          offlineQueue.dequeue(operation.id);
          success++;
          const payload = operation.payload as { userId?: unknown } | null;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-operation-synced', {
              detail: { userId: payload?.userId, entity: operation.entity, operationId: operation.id },
            }));
          }
        } else {
          blockedUsers.add(owner);
          if (expenseKey) blockedExpenseKeys.add(expenseKey);
          if (operation.entity === 'budget') {
            const payload = operation.payload as { userId?: unknown };
            if (!auth.currentUser?.uid || payload?.userId !== auth.currentUser.uid) continue;
          }
          const canRetry = offlineQueue.incrementRetry(operation.id);
          if (budgetKey) blockedBudgetKeys.add(budgetKey);
          if (!canRetry) {
            failed++;
            if (operation.entity === 'expense') {
              const retainedOperation = offlineQueue.getAll().find((queuedOperation) => queuedOperation.id === operation.id);
              if (retainedOperation?.status === 'needs-attention') {
                this.notifyExpenseOperationNeedsAttention(retainedOperation);
              }
            }
            this.notifyOperationNeedsAttention(operation);
            if (operation.entity === 'budget') {
              rejectedBudgetOperations.push(operation);
              if (operation.type === 'create' && budgetKey) {
                const payload = operation.payload as { id: string; userId: string };
                offlineQueue.removeBudgetOperationsForId(payload.id, payload.userId);
              }
            }
          }
        }
      } catch (error) {
        blockedUsers.add(owner);
        console.error('Error executing queued operation:', error);
        if (expenseKey) blockedExpenseKeys.add(expenseKey);
        if (operation.entity === 'budget') {
          const payload = operation.payload as { userId?: unknown };
          if (!auth.currentUser?.uid || payload?.userId !== auth.currentUser.uid) continue;
        }
        const canRetry = offlineQueue.incrementRetry(operation.id);
        if (budgetKey) blockedBudgetKeys.add(budgetKey);
        if (!canRetry) {
          failed++;
          if (operation.entity === 'expense') {
            const retainedOperation = offlineQueue.getAll().find((queuedOperation) => queuedOperation.id === operation.id);
            if (retainedOperation?.status === 'needs-attention') {
              this.notifyExpenseOperationNeedsAttention(retainedOperation);
            }
          }
          this.notifyOperationNeedsAttention(operation);
          if (operation.entity === 'budget') {
            rejectedBudgetOperations.push(operation);
            if (operation.type === 'create' && budgetKey) {
              const payload = operation.payload as { id: string; userId: string };
              offlineQueue.removeBudgetOperationsForId(payload.id, payload.userId);
            }
          }
        }
      }
    }

    this.isSyncing = false;

    rejectedBudgetOperations.forEach((operation) => this.notifyBudgetOperationRejected(operation));

    this.notifyProgress({
      total: queue.length,
      completed: success,
      failed,
      currentOperation: 'Sync complete',
      budgetRejections: rejectedBudgetOperations.length,
    });

    const initialOperationIds = new Set(queue.map((operation) => operation.id));
    const hasOperationsAddedDuringSync = offlineQueue.getAll().some((operation) => !initialOperationIds.has(operation.id));
    if (hasOperationsAddedDuringSync) {
      setTimeout(() => { void this.syncOfflineQueue(); }, 0);
    }

    return { success, failed };
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      switch (operation.entity) {
        case 'expense':
          return await this.executeExpenseOperation(operation);
        case 'category':
          return await this.executeCategoryOperation(operation);
        case 'budget':
          return await this.executeBudgetOperation(operation);
        case 'recurring':
          return await this.executeRecurringOperation(operation);
        case 'scheduledPayment':
          return await this.executeScheduledPaymentOperation(operation);
        case 'scheduledPaymentRecord':
          return await this.executeScheduledPaymentRecordOperation(operation);
        case 'income':
          return await this.executeIncomeOperation(operation);
        case 'card':
          return await this.executeCardOperation(operation);
        case 'bank':
          return await this.executeBankOperation(operation);
        case 'ewallet':
          return await this.executeEWalletOperation(operation);
        case 'repayment':
          return await this.executeRepaymentOperation(operation);
        case 'transfer':
          return await this.executeTransferOperation(operation);
        case 'featureSettings':
          return await this.executeFeatureSettingsOperation(operation);
        case 'quickExpensePreset':
          return await this.executeQuickExpensePresetOperation(operation);
        case 'userSettings':
          return await this.executeUserSettingsOperation(operation);
        case 'dashboardLayout':
          return await this.executeDashboardLayoutOperation(operation);
        case 'friendPreference': {
          const payload = asSyncPayload(operation.payload);
          if (operation.type !== 'update' || payload?.userId !== auth.currentUser?.uid ||
              typeof payload?.userId !== 'string' || typeof payload.id !== 'string' || !asSyncPayload(payload.preference)) return false;
          await friendSpendingService.savePreference(payload.userId, payload.id,
            payload.preference as Parameters<typeof friendSpendingService.savePreference>[2]);
          return true;
        }
        default:
          console.warn('Unknown entity type:', operation.entity);
          return false;
      }
    } catch (error) {
      console.error('Error executing operation:', error);
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
        );
        return true;
      case 'update':
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await expenseService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        await expenseService.deleteWithRelatedTransfers(
          payload.id,
          signedInUserId,
          Array.isArray(payload.relatedTransferIds)
            ? payload.relatedTransferIds.filter((transferId: unknown): transferId is string => typeof transferId === 'string')
            : [],
        );
        return true;
      default:
        return false;
    }
  }

  private async executeCategoryOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await categoryService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await categoryService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await categoryService.delete(payload.id);
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
          await budgetService.delete(payload.id);
          return true;
        case 'create':
          await budgetService.create({ ...payload, userId: signedInUserId });
          return true;
        case 'update': {
          if (!payload.id) return false;
          const updates = { ...payload };
          delete updates.previousBudget;
          await budgetService.update(payload.id, { ...updates, userId: signedInUserId });
          return true;
        }
        default:
          return false;
      }
    });
  }

  private async executeRecurringOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await recurringExpenseService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await recurringExpenseService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await recurringExpenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeScheduledPaymentOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;

    switch (operation.type) {
      case 'create':
        await scheduledPaymentService.create(payload as Parameters<typeof scheduledPaymentService.create>[0]);
        return true;
      case 'update': {
        if (typeof payload.id !== 'string') return false;
        const updates = { ...payload };
        delete updates.id;
        delete updates.userId;
        await scheduledPaymentService.update(payload.id, updates as Parameters<typeof scheduledPaymentService.update>[1]);
        return true;
      }
      case 'delete':
        if (typeof payload.id !== 'string') return false;
        await scheduledPaymentService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeScheduledPaymentRecordOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId || typeof payload.id !== 'string') return false;
    if (operation.type === 'delete') {
      await scheduledPaymentService.deletePaymentRecord(payload.id);
      return true;
    }
    if (operation.type === 'create') {
      const { generatedExpensePayload, ...recordFields } = payload;
      await scheduledPaymentService.createPaymentRecord(
        recordFields as Parameters<typeof scheduledPaymentService.createPaymentRecord>[0],
      );
      if (generatedExpensePayload) {
        const expensePayload = asSyncPayload(generatedExpensePayload);
        if (!expensePayload) return false;
        if (expensePayload.userId !== signedInUserId || typeof expensePayload.id !== 'string') return false;
        await expenseService.create(
          expensePayload as Parameters<typeof expenseService.create>[0],
          { updateAccountBalances: true },
        );
      }
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
        await incomeService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await incomeService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await incomeService.delete(payload.id, signedInUserId);
        return true;
      default:
        return false;
    }
  }

  private async executeCardOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await cardService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await cardService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await cardService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeBankOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await bankService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await bankService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await bankService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeEWalletOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await ewalletService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await ewalletService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await ewalletService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeRepaymentOperation(operation: QueuedOperation): Promise<boolean> {
    // Type assertion needed as payload can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId) return false;
    
    switch (operation.type) {
      case 'create':
        await repaymentService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        {
          const updates = { ...payload };
          delete updates.id;
          delete updates.userId;
          await repaymentService.update(payload.id, updates);
        }
        return true;
      case 'delete':
        if (!payload.id) return false;
        await repaymentService.delete(payload.id);
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
        await transferService.create(payload as Parameters<typeof transferService.create>[0]);
        return true;
      case 'update': {
        const updates = { ...payload };
        delete updates.id;
        delete updates.userId;
        await transferService.update(payload.id, updates as Parameters<typeof transferService.update>[1]);
        return true;
      }
      case 'delete':
        await transferService.deleteWithBalanceReversal(payload.id, signedInUserId);
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
      await featureSettingsService.resetToDefaults(signedInUserId);
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
    );
    return true;
  }

  private async executeQuickExpensePresetOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = asSyncPayload(operation.payload);
    const signedInUserId = auth.currentUser?.uid;
    if (!signedInUserId || payload?.userId !== signedInUserId || typeof payload.id !== 'string') return false;

    switch (operation.type) {
      case 'create':
        await quickExpenseService.create(signedInUserId, payload as unknown as Parameters<typeof quickExpenseService.create>[1]);
        return true;
      case 'update': {
        const updates = { ...payload };
        delete updates.id;
        delete updates.userId;
        await quickExpenseService.update(payload.id, updates as Parameters<typeof quickExpenseService.update>[1]);
        return true;
      }
      case 'delete':
        await quickExpenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeUserSettingsOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as { userId?: unknown; updates?: unknown } | null;
    const signedInUserId = auth.currentUser?.uid;
    if (operation.type !== 'update' || !signedInUserId || payload?.userId !== signedInUserId ||
        !payload.updates || typeof payload.updates !== 'object' || Array.isArray(payload.updates)) return false;
    await userSettingsService.getOrCreate(signedInUserId);
    await userSettingsService.update(signedInUserId, payload.updates as Record<string, unknown>);
    return true;
  }

  private async executeDashboardLayoutOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as { userId?: unknown; widgets?: unknown } | null;
    const signedInUserId = auth.currentUser?.uid;
    if (operation.type !== 'update' || !signedInUserId || payload?.userId !== signedInUserId || !Array.isArray(payload.widgets)) return false;
    await dashboardLayoutService.updateWidgets(signedInUserId, payload.widgets as import('../types/dashboard').DashboardWidget[]);
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
