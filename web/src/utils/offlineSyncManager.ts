/**
 * Enhanced Offline Sync Manager
 * 
 * Provides a robust offline-first data synchronization system that:
 * 1. Caches data in sessionStorage for quick offline access
 * 2. Monitors network status and automatically syncs when online
 * 3. Processes queued operations with exponential backoff
 * 4. Provides hooks for UI updates during sync
 */

import { offlineQueue, QueuedOperation } from './offlineQueue';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  queuedOperations: number;
}

export type SyncCallback = (status: SyncStatus) => void;
export type OperationExecutor = (operation: QueuedOperation) => Promise<boolean>;

class OfflineSyncManager {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private lastSyncTime: number | null = null;
  private syncCallbacks: Set<SyncCallback> = new Set();
  private operationExecutor: OperationExecutor | null = null;
  private autoSyncInterval: number | null = null;
  private syncInProgress: boolean = false;
  
  // Configuration
  private readonly AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds when online
  private readonly SESSION_CACHE_PREFIX = 'expense_cache_';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the sync manager
   */
  private initialize(): void {
    // Listen to online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Initial sync check if online
    if (this.isOnline) {
      this.startAutoSync();
    }
    
    // Restore last sync time from localStorage
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      this.lastSyncTime = parseInt(lastSync, 10);
    }
  }

  /**
   * Set the operation executor function
   */
  setOperationExecutor(executor: OperationExecutor): void {
    this.operationExecutor = executor;
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('[OfflineSyncManager] Network connection detected');
    this.isOnline = true;
    this.notifyStatusChange();
    
    // Automatically sync queued operations
    this.syncQueuedOperations();
    
    // Start auto-sync interval
    this.startAutoSync();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('[OfflineSyncManager] Network connection lost');
    this.isOnline = false;
    this.notifyStatusChange();
    
    // Stop auto-sync when offline
    this.stopAutoSync();
  };

  /**
   * Start automatic sync interval
   */
  private startAutoSync(): void {
    if (this.autoSyncInterval) {
      return; // Already running
    }
    
    this.autoSyncInterval = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncQueuedOperations();
      }
    }, this.AUTO_SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic sync interval
   */
  private stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Sync queued operations
   */
  async syncQueuedOperations(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('[OfflineSyncManager] Sync already in progress, skipping...');
      return { success: 0, failed: 0 };
    }

    const queueCount = offlineQueue.count();
    if (queueCount === 0) {
      return { success: 0, failed: 0 };
    }

    if (!this.operationExecutor) {
      console.warn('[OfflineSyncManager] No operation executor set');
      return { success: 0, failed: 0 };
    }

    if (!this.isOnline) {
      console.log('[OfflineSyncManager] Offline, skipping sync');
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    this.isSyncing = true;
    this.notifyStatusChange();

    console.log(`[OfflineSyncManager] Starting sync of ${queueCount} operations...`);

    try {
      const result = await offlineQueue.processQueue(this.operationExecutor);
      
      this.lastSyncTime = Date.now();
      localStorage.setItem('lastSyncTime', this.lastSyncTime.toString());
      
      console.log(`[OfflineSyncManager] Sync completed: ${result.success} succeeded, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      console.error('[OfflineSyncManager] Sync error:', error);
      return { success: 0, failed: queueCount };
    } finally {
      this.isSyncing = false;
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<{ success: number; failed: number }> {
    return this.syncQueuedOperations();
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: SyncCallback): () => void {
    this.syncCallbacks.add(callback);
    
    // Immediately notify with current status
    callback(this.getStatus());
    
    // Return unsubscribe function
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.syncCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[OfflineSyncManager] Error in sync callback:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      queuedOperations: offlineQueue.count(),
    };
  }

  /**
   * Cache data in sessionStorage
   */
  cacheData<T>(key: string, data: T): void {
    try {
      const cacheKey = `${this.SESSION_CACHE_PREFIX}${key}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('[OfflineSyncManager] Error caching data:', error);
    }
  }

  /**
   * Get cached data from sessionStorage
   */
  getCachedData<T>(key: string): T | null {
    try {
      const cacheKey = `${this.SESSION_CACHE_PREFIX}${key}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('[OfflineSyncManager] Error reading cached data:', error);
    }
    return null;
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.SESSION_CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[OfflineSyncManager] Error clearing cache:', error);
    }
  }

  /**
   * Check if data is cached
   */
  hasCachedData(key: string): boolean {
    const cacheKey = `${this.SESSION_CACHE_PREFIX}${key}`;
    return sessionStorage.getItem(cacheKey) !== null;
  }

  /**
   * Cleanup and remove event listeners
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopAutoSync();
    this.syncCallbacks.clear();
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();
