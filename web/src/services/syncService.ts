/**
 * Sync Service - Manages synchronization of offline operations with Firebase
 * Handles automatic sync when connection is restored and manual sync triggers
 */

import { offlineQueue, QueuedOperation } from '../utils/offlineQueue';
import { expenseService } from './expenseService';
import { categoryService } from './categoryService';
import { budgetService } from './budgetService';
import { recurringExpenseService } from './recurringExpenseService';
import { incomeService } from './incomeService';
import { cardService } from './cardService';
import { ewalletService } from './ewalletService';
import { bankService } from './bankService';
import { repaymentService } from './repaymentService';
import { networkStatusService } from './networkStatusService';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

type SyncListener = (progress: SyncProgress) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private autoSyncEnabled: boolean;
  private networkUnsubscribe: (() => void) | null = null;

  constructor() {
    // Initialize autoSyncEnabled from localStorage
    this.autoSyncEnabled = this.isAutoSyncEnabled();
  }

  /**
   * Initialize the sync service
   */
  initialize(): void {
    // Subscribe to network status changes for auto-sync
    this.networkUnsubscribe = networkStatusService.subscribe((isOnline) => {
      if (isOnline && this.autoSyncEnabled && offlineQueue.hasPendingOperations()) {
        console.log('🔄 Connection restored, starting auto-sync...');
        this.syncAll();
      }
    });
  }

  /**
   * Cleanup the sync service
   */
  cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }

  /**
   * Subscribe to sync progress updates
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Enable/disable auto-sync
   */
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    localStorage.setItem('autoSyncEnabled', JSON.stringify(enabled));
  }

  /**
   * Get auto-sync status
   */
  isAutoSyncEnabled(): boolean {
    try {
      const saved = localStorage.getItem('autoSyncEnabled');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  get syncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all pending operations
   */
  async syncAll(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.warn('⚠️ Sync already in progress');
      return { success: 0, failed: 0 };
    }

    if (!networkStatusService.isOnline) {
      console.warn('⚠️ Cannot sync while offline');
      return { success: 0, failed: 0 };
    }

    const queue = offlineQueue.getAll();
    if (queue.length === 0) {
      console.log('✅ No operations to sync');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({
      total: queue.length,
      completed: 0,
      failed: 0,
      inProgress: true,
    });

    console.log(`🔄 Starting sync of ${queue.length} operations...`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
      const operation = queue[i];
      
      try {
        const result = await this.executeOperation(operation);
        if (result) {
          offlineQueue.dequeue(operation.id);
          success++;
          console.log(`✅ Synced operation ${i + 1}/${queue.length}: ${operation.entity} ${operation.type}`);
        } else {
          const canRetry = offlineQueue.incrementRetry(operation.id);
          if (!canRetry) {
            failed++;
            console.error(`❌ Operation failed after max retries: ${operation.entity} ${operation.type}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing operation ${i + 1}/${queue.length}:`, error);
        const canRetry = offlineQueue.incrementRetry(operation.id);
        if (!canRetry) {
          failed++;
        }
      }

      // Notify progress
      this.notifyListeners({
        total: queue.length,
        completed: success,
        failed,
        inProgress: true,
      });
    }

    this.isSyncing = false;
    this.notifyListeners({
      total: queue.length,
      completed: success,
      failed,
      inProgress: false,
    });

    console.log(`✅ Sync complete: ${success} succeeded, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Execute a single operation
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
        case 'ewallet':
          return await this.executeEWalletOperation(operation);
        case 'bank':
          return await this.executeBankOperation(operation);
        case 'repayment':
          return await this.executeRepaymentOperation(operation);
        default:
          console.error('Unknown entity type:', operation.entity);
          return false;
      }
    } catch (error) {
      console.error('Error executing operation:', error);
      return false;
    }
  }

  // Entity-specific operation executors
  private async executeExpenseOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await expenseService.create(payload);
        return true;
      case 'update':
        await expenseService.update(payload.id, payload);
        return true;
      case 'delete':
        await expenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeCategoryOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await categoryService.create(payload);
        return true;
      case 'update':
        await categoryService.update(payload.id, payload);
        return true;
      case 'delete':
        await categoryService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeBudgetOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await budgetService.create(payload);
        return true;
      case 'update':
        await budgetService.update(payload.id, payload);
        return true;
      case 'delete':
        await budgetService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeRecurringOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await recurringExpenseService.create(payload);
        return true;
      case 'update':
        await recurringExpenseService.update(payload.id, payload);
        return true;
      case 'delete':
        await recurringExpenseService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeIncomeOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await incomeService.create(payload);
        return true;
      case 'update':
        await incomeService.update(payload.id, payload);
        return true;
      case 'delete':
        await incomeService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeCardOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await cardService.create(payload);
        return true;
      case 'update':
        await cardService.update(payload.id, payload);
        return true;
      case 'delete':
        await cardService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeEWalletOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await ewalletService.create(payload);
        return true;
      case 'update':
        await ewalletService.update(payload.id, payload);
        return true;
      case 'delete':
        await ewalletService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeBankOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await bankService.create(payload);
        return true;
      case 'update':
        await bankService.update(payload.id, payload);
        return true;
      case 'delete':
        await bankService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  private async executeRepaymentOperation(operation: QueuedOperation): Promise<boolean> {
    const payload = operation.payload as any;
    switch (operation.type) {
      case 'create':
        await repaymentService.create(payload);
        return true;
      case 'update':
        await repaymentService.update(payload.id, payload);
        return true;
      case 'delete':
        await repaymentService.delete(payload.id);
        return true;
      default:
        return false;
    }
  }

  /**
   * Notify all listeners of sync progress
   */
  private notifyListeners(progress: SyncProgress): void {
    this.listeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }
}

// Export singleton instance
export const syncService = new SyncService();
