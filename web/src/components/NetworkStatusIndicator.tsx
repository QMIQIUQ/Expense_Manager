/**
 * Network Status Indicator Component
 * 
 * Displays online/offline status and sync information in the UI
 */

import React from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useLanguage } from '../contexts/LanguageContext';

interface NetworkStatusIndicatorProps {
  showInHeader?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ showInHeader = true }) => {
  const { isOnline, isSyncing, queuedOperations } = useOfflineSync();
  const { t } = useLanguage();

  // Don't show anything if online and no queue
  if (isOnline && queuedOperations === 0 && !isSyncing) {
    return null;
  }

  const getStatusColor = () => {
    if (!isOnline) return 'var(--error-text)';
    if (isSyncing) return 'var(--warning-text)';
    if (queuedOperations > 0) return 'var(--warning-text)';
    return 'var(--success-text)';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '🔴';
    if (isSyncing) return '🔄';
    if (queuedOperations > 0) return '⚠️';
    return '🟢';
  };

  const getStatusText = () => {
    if (!isOnline) {
      return t('offline') || 'Offline';
    }
    if (isSyncing) {
      return t('syncing') || 'Syncing...';
    }
    if (queuedOperations > 0) {
      return `${queuedOperations} ${t('pendingChanges') || 'pending'}`;
    }
    return t('online') || 'Online';
  };

  const getAriaLabel = () => {
    if (!isOnline) {
      return 'Network status: Offline';
    }
    if (isSyncing) {
      return 'Network status: Syncing data';
    }
    if (queuedOperations > 0) {
      return `Network status: Online with ${queuedOperations} pending changes`;
    }
    return 'Network status: Online';
  };

  if (showInHeader) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
        role="status"
        aria-live="polite"
        aria-label={getAriaLabel()}
        style={{
          backgroundColor: !isOnline ? 'var(--error-bg)' : 'var(--warning-bg)',
          border: `1px solid ${!isOnline ? 'var(--error-border)' : 'var(--warning-border)'}`,
          color: getStatusColor(),
        }}
      >
        <span className={isSyncing ? 'animate-spin' : ''} aria-hidden="true">
          {getStatusIcon()}
        </span>
        <span>{getStatusText()}</span>
      </div>
    );
  }

  // Inline version for use in other places
  return (
    <div 
      className="flex items-center gap-1 text-xs" 
      role="status"
      aria-live="polite"
      aria-label={getAriaLabel()}
      style={{ color: getStatusColor() }}
    >
      <span className={isSyncing ? 'animate-spin' : ''} aria-hidden="true">{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
    </div>
  );
};

export default NetworkStatusIndicator;
