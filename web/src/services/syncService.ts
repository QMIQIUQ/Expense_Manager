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
import { offlineQueue, QueuedOperation } from '../utils/offlineQueue';
import { networkStatus } from '../utils/networkStatus';
import { sessionCache, CacheableEntity } from '../utils/sessionCache';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentOperation?: string;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

class SyncService {
  private isSyncing = false;
  private syncCallbacks: Set<SyncProgressCallback> = new Set();
  private autoSyncEnabled = true;

  constructor() {
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

    this.notifyProgress({
      total: queue.length,
      completed: 0,
      failed: 0,
      currentOperation: 'Starting sync...',
    });

    for (let i = 0; i < queue.length; i++) {
      const operation = queue[i];
      
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
        } else {
          const canRetry = offlineQueue.incrementRetry(operation.id);
          if (!canRetry) {
            failed++;
          }
        }
      } catch (error) {
        console.error('Error executing queued operation:', error);
        const canRetry = offlineQueue.incrementRetry(operation.id);
        if (!canRetry) {
          failed++;
        }
      }
    }

    this.isSyncing = false;

    this.notifyProgress({
      total: queue.length,
      completed: success,
      failed,
      currentOperation: 'Sync complete',
    });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await expenseService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await expenseService.update(payload.id, payload);
        return true;
      case 'delete':
        if (!payload.id) return false;
        await expenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeCategoryOperation(operation: QueuedOperation): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await categoryService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await categoryService.update(payload.id, payload);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await budgetService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await budgetService.update(payload.id, payload);
        return true;
      case 'delete':
        if (!payload.id) return false;
        await budgetService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeRecurringOperation(operation: QueuedOperation): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await recurringExpenseService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await recurringExpenseService.update(payload.id, payload);
        return true;
      case 'delete':
        if (!payload.id) return false;
        await recurringExpenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeIncomeOperation(operation: QueuedOperation): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await incomeService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await incomeService.update(payload.id, payload);
        return true;
      case 'delete':
        if (!payload.id) return false;
        await incomeService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeCardOperation(operation: QueuedOperation): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await cardService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await cardService.update(payload.id, payload);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await bankService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await bankService.update(payload.id, payload);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await ewalletService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await ewalletService.update(payload.id, payload);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = operation.payload as any;
    
    switch (operation.type) {
      case 'create':
        await repaymentService.create(payload);
        return true;
      case 'update':
        if (!payload.id) return false;
        await repaymentService.update(payload.id, payload);
        return true;
      case 'delete':
        if (!payload.id) return false;
        await repaymentService.delete(payload.id);
        return true;
      default:
        return false;
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;

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
    const entities: CacheableEntity[] = [
      'expenses',
      'categories',
      'budgets',
      'recurring',
      'incomes',
      'cards',
      'banks',
      'ewallets',
      'repayments',
    ];

    const promises = entities.map((entity) => 
      this.refreshCache(entity, userId).catch((error) => {
        console.error(`Failed to refresh cache for ${entity}:`, error);
      })
    );

    await Promise.all(promises);
  }
}

// Export singleton instance
export const syncService = new SyncService();
