/**
 * useSyncStatus Hook
 * React hook for monitoring background sync progress
 */

import { useState, useEffect } from 'react';
import { syncService, SyncProgress } from '../services/syncService';

export const useSyncStatus = () => {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Update initial pending count
    setPendingCount(syncService.pendingCount);

    // Subscribe to sync progress
    const unsubscribe = syncService.onSyncProgress((progress) => {
      setSyncProgress(progress);
      setIsSyncing(syncService.isSyncInProgress);
      setPendingCount(syncService.pendingCount);
    });

    // Update sync status periodically
    const interval = setInterval(() => {
      setIsSyncing(syncService.isSyncInProgress);
      setPendingCount(syncService.pendingCount);
    }, 1000);

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    syncProgress,
    isSyncing,
    pendingCount,
    syncNow: () => syncService.syncOfflineQueue(),
  };
};
