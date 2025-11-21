import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineQueue } from '../utils/offlineQueue';
import { syncService, SyncProgress } from '../services/syncService';
import { useLanguage } from '../contexts/LanguageContext';

const NetworkStatusIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { t } = useLanguage();
  const [queueCount, setQueueCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [showSyncMenu, setShowSyncMenu] = useState(false);

  // Update queue count periodically
  useEffect(() => {
    const updateCount = () => {
      setQueueCount(offlineQueue.count());
    };
    
    updateCount();
    const interval = setInterval(updateCount, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to sync progress
  useEffect(() => {
    const unsubscribe = syncService.subscribe((progress) => {
      setSyncProgress(progress);
      if (!progress.inProgress) {
        // Clear progress after 3 seconds
        setTimeout(() => setSyncProgress(null), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setShowSyncMenu(false);
    await syncService.syncAll();
  };

  const handleClearQueue = () => {
    if (confirm(t('confirmClearOfflineQueue') || 'Clear all pending offline operations?')) {
      offlineQueue.clear();
      setQueueCount(0);
      setShowSyncMenu(false);
    }
  };

  // Don't show if no issues
  if (isOnline && queueCount === 0 && !syncProgress) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Network Status */}
      <div style={{
        ...styles.indicator,
        ...(isOnline ? styles.indicatorOnline : styles.indicatorOffline)
      }}>
        <span style={styles.dot}>●</span>
        <span style={styles.text}>
          {isOnline ? t('networkOnline') || 'Online' : t('networkOffline') || 'Offline'}
        </span>
      </div>

      {/* Queue Count */}
      {queueCount > 0 && (
        <div 
          style={styles.queueBadge}
          onClick={() => setShowSyncMenu(!showSyncMenu)}
          title={t('pendingOperations') || 'Pending operations'}
        >
          <span>📤</span>
          <span style={styles.queueCount}>{queueCount}</span>
        </div>
      )}

      {/* Sync Progress */}
      {syncProgress && syncProgress.inProgress && (
        <div style={styles.syncProgress}>
          <span style={styles.spinnerIcon}>⟳</span>
          <span style={styles.text}>
            {t('syncing') || 'Syncing'}: {syncProgress.completed}/{syncProgress.total}
          </span>
        </div>
      )}

      {/* Sync completed notification */}
      {syncProgress && !syncProgress.inProgress && syncProgress.completed > 0 && (
        <div style={styles.syncComplete}>
          <span>✓</span>
          <span style={styles.text}>
            {t('syncComplete') || 'Sync complete'}: {syncProgress.completed} {t('synced') || 'synced'}
            {syncProgress.failed > 0 && `, ${syncProgress.failed} ${t('syncFailed') || 'failed'}`}
          </span>
        </div>
      )}

      {/* Sync Menu */}
      {showSyncMenu && (
        <>
          <div 
            style={styles.overlay} 
            onClick={() => setShowSyncMenu(false)}
          />
          <div style={styles.menu}>
            <div style={styles.menuHeader}>
              <span style={styles.menuTitle}>
                {t('offlineOperations') || 'Offline Operations'}
              </span>
              <span style={styles.menuCount}>{queueCount}</span>
            </div>
            
            <button
              style={styles.menuButton}
              onClick={handleManualSync}
              disabled={!isOnline || syncProgress?.inProgress}
            >
              <span>🔄</span>
              <span>{t('syncNow') || 'Sync Now'}</span>
            </button>

            <button
              style={styles.menuButtonDanger}
              onClick={handleClearQueue}
            >
              <span>🗑️</span>
              <span>{t('clearOfflineQueue') || 'Clear Queue'}</span>
            </button>

            {!isOnline && (
              <div style={styles.menuNote}>
                {t('syncOfflineNote') || 'Connect to internet to sync'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative' as const,
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    transition: 'all 0.3s',
  },
  indicatorOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'rgb(16, 185, 129)',
  },
  indicatorOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'rgb(239, 68, 68)',
  },
  dot: {
    fontSize: '8px',
  },
  text: {
    fontSize: '12px',
  },
  queueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    color: 'rgb(249, 115, 22)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  queueCount: {
    fontSize: '12px',
    fontWeight: '600' as const,
  },
  syncProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: 'rgb(59, 130, 246)',
    fontSize: '12px',
  },
  syncComplete: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'rgb(16, 185, 129)',
    fontSize: '12px',
  },
  spinnerIcon: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '220px',
    padding: '8px',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '8px',
  },
  menuTitle: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  menuCount: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: 'var(--accent-primary)',
  },
  menuButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '4px',
  },
  menuButtonDanger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: 'rgb(239, 68, 68)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  menuNote: {
    padding: '8px 12px',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    borderTop: '1px solid var(--border-color)',
    textAlign: 'center' as const,
  },
};

export default NetworkStatusIndicator;
