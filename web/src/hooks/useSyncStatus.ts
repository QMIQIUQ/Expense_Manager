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

    const updateStatus = () => {
      setIsSyncing(syncService.isSyncInProgress);
      setPendingCount(syncService.pendingCount);
    };
    window.addEventListener('offline-queue-changed', updateStatus);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Cleanup
    return () => {
      unsubscribe();
      window.removeEventListener('offline-queue-changed', updateStatus);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return {
    syncProgress,
    isSyncing,
    pendingCount,
    syncNow: () => syncService.syncOfflineQueue(),
  };
};
