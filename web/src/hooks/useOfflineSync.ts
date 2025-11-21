/**
 * React Hook for Offline Sync
 * 
 * Provides React components with access to offline sync functionality
 * and real-time sync status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineSyncManager, SyncStatus } from '../utils/offlineSyncManager';

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    offlineSyncManager.getStatus()
  );

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = offlineSyncManager.subscribe((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const manualSync = useCallback(async () => {
    return offlineSyncManager.manualSync();
  }, []);

  const cacheData = useCallback(<T,>(key: string, data: T) => {
    offlineSyncManager.cacheData(key, data);
  }, []);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    return offlineSyncManager.getCachedData<T>(key);
  }, []);

  const clearCache = useCallback(() => {
    offlineSyncManager.clearCache();
  }, []);

  const hasCachedData = useCallback((key: string): boolean => {
    return offlineSyncManager.hasCachedData(key);
  }, []);

  return {
    syncStatus,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSyncTime: syncStatus.lastSyncTime,
    queuedOperations: syncStatus.queuedOperations,
    manualSync,
    cacheData,
    getCachedData,
    clearCache,
    hasCachedData,
  };
};
