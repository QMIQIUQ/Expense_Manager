/**
 * Network Status Indicator Component
 * Displays online/offline status and sync progress in header
 */

import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useLanguage } from '../contexts/LanguageContext';

const NetworkStatusIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { isSyncing, pendingCount, syncNow } = useSyncStatus();
  const { t } = useLanguage();

  return (
    <div className="network-status-container">
      <style>{`
        .network-status-container {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-dot.online {
          background-color: var(--success-text, #22c55e);
        }

        .status-dot.offline {
          background-color: var(--error-text, #ef4444);
        }

        .status-dot.syncing {
          background-color: var(--info-text, #3b82f6);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .status-dot.pending {
          background-color: var(--warning-text, #f59e0b);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-label {
          font-size: 12px;
          font-weight: 500;
        }

        .status-label.clickable {
          cursor: pointer;
          text-decoration: underline;
        }

        .status-label.clickable:hover {
          color: var(--warning-text, #f59e0b);
        }
      `}</style>

      {pendingCount > 0 ? (
        <>
          <span className="status-dot pending" />
          <span 
            className="status-label clickable"
            onClick={syncNow}
            title={t('networkPendingTitle').replace('{count}', String(pendingCount))}
          >
            {pendingCount} {t('networkPending')}
          </span>
        </>
      ) : isSyncing ? (
        <>
          <span className="status-dot syncing" />
          <span className="status-label">{t('networkSyncing')}</span>
        </>
      ) : !isOnline ? (
        <>
          <span className="status-dot offline" />
          <span className="status-label">{t('networkOffline')}</span>
        </>
      ) : (
        <>
          <span className="status-dot online" />
          <span className="status-label">{t('networkOnline')}</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
