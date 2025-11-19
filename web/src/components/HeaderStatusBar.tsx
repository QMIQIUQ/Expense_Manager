import React from 'react';
import { useNotification, Notification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ImportProgress {
  id: string;
  current: number;
  total: number;
  message: string;
  status: 'importing' | 'complete' | 'error';
}

interface DeleteProgress {
  id: string;
  current: number;
  total: number;
  message: string;
  status: 'deleting' | 'complete' | 'error';
}

interface HeaderStatusBarProps {
  importProgress?: ImportProgress;
  deleteProgress?: DeleteProgress;
  onDismissImport?: () => void;
  onDismissDelete?: () => void;
}

const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({ 
  importProgress,
  deleteProgress,
  onDismissImport,
  onDismissDelete
}) => {
  const { notifications, hideNotification } = useNotification();
  const { t } = useLanguage();

  // 如果沒有通知也沒有匯入/刪除進度，不顯示
  if (notifications.length === 0 && !importProgress && !deleteProgress) {
    return null;
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'var(--success-text)';
      case 'error':
        return 'var(--error-text)';
      case 'info':
        return 'var(--info-text)';
      case 'pending':
        return 'var(--warning-text)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      case 'pending':
        return '⟳';
      default:
        return '';
    }
  };

  return (
    <>
      {/* 匯入進度 */}
      {importProgress && (
        <div style={{
          ...styles.stickyWrapper,
          ...styles.statusItem,
          ...(importProgress.status === 'importing' ? styles.statusItemImporting : 
              importProgress.status === 'complete' ? styles.statusItemComplete : 
              importProgress.status === 'error' ? styles.statusItemError : 
              styles.statusItemDefault)
        }}>
          <div style={styles.statusRow}>
            <div style={styles.statusLeft}>
              {importProgress.status === 'importing' && (
                <span style={styles.spinnerIcon}>⟳</span>
              )}
              {importProgress.status === 'complete' && (
                <span style={{ fontSize: '16px', color: 'var(--success-text)' }}>✓</span>
              )}
              {importProgress.status === 'error' && (
                <span style={{ fontSize: '16px', color: 'var(--error-text)' }}>✕</span>
              )}
              <span style={styles.statusText}>
                {importProgress.status === 'importing' && t('importing')}
                {importProgress.status === 'complete' && t('importComplete')}
                {importProgress.status === 'error' && t('importFailed')}
              </span>
              <span style={styles.statusMessage}>{importProgress.message}</span>
            </div>
            {(importProgress.status === 'complete' || importProgress.status === 'error') && onDismissImport && (
              <button
                onClick={onDismissImport}
                style={styles.closeBtn}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
          
          {importProgress.status === 'importing' && (
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 刪除進度 */}
      {deleteProgress && (
        <div style={{
          ...styles.stickyWrapper,
          ...styles.statusItem,
          ...(deleteProgress.status === 'deleting' ? styles.statusItemDeleting : 
              deleteProgress.status === 'complete' ? styles.statusItemComplete : 
              deleteProgress.status === 'error' ? styles.statusItemError : 
              styles.statusItemDefault)
        }}>
          <div style={styles.statusRow}>
            <div style={styles.statusLeft}>
              {deleteProgress.status === 'deleting' && (
                <span style={styles.spinnerIcon}>⟳</span>
              )}
              {deleteProgress.status === 'complete' && (
                <span style={{ fontSize: '16px', color: 'var(--success-text)' }}>✓</span>
              )}
              {deleteProgress.status === 'error' && (
                <span style={{ fontSize: '16px', color: 'var(--error-text)' }}>✕</span>
              )}
              <span style={styles.statusText}>
                {deleteProgress.status === 'deleting' && t('deleteSelected')}
                {deleteProgress.status === 'complete' && t('success')}
                {deleteProgress.status === 'error' && t('error')}
              </span>
              <span style={styles.statusMessage}>{deleteProgress.message}</span>
            </div>
            {(deleteProgress.status === 'complete' || deleteProgress.status === 'error') && onDismissDelete && (
              <button
                onClick={onDismissDelete}
                style={styles.closeBtn}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
          
          {deleteProgress.status === 'deleting' && (
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${(deleteProgress.current / deleteProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 通知列表 */}
      {notifications.map((notification) => (
        <div 
          key={notification.id} 
          style={{
            ...styles.stickyWrapper,
            ...styles.statusItem,
            ...(notification.type === 'pending' ? styles.statusItemImporting :
                notification.type === 'success' ? styles.statusItemComplete :
                notification.type === 'error' ? styles.statusItemError :
                styles.statusItemDefault)
          }}
        >
          <div style={styles.statusRow}>
            <div style={styles.statusLeft}>
              <span style={{ 
                fontSize: '16px',
                color: getNotificationColor(notification.type) 
              }}>
                {getNotificationIcon(notification.type)}
              </span>
              <span style={styles.statusText}>{notification.message}</span>
            </div>
            <div style={styles.statusActions}>
              {notification.actions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    hideNotification(notification.id);
                  }}
                  style={styles.actionBtn}
                >
                  {action.label}
                </button>
              ))}
              <button
                onClick={() => hideNotification(notification.id)}
                style={styles.closeBtn}
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

const styles = {
  stickyWrapper: {
    position: 'sticky' as const,
    top: '8px',
    zIndex: 1000,
    margin: '8px 16px',
  },
  // 簡化的狀態項目樣式（類似 tab 的 div）
  statusItem: {
    borderRadius: '8px',
    padding: '8px 16px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--card-bg)',
    transition: 'background-color 0.3s, border-color 0.3s',
  },
  statusItemImporting: {
    backgroundColor: 'var(--info-bg)',
    borderColor: 'var(--info-text)',
  },
  statusItemDeleting: {
    backgroundColor: 'var(--warning-bg)',
    borderColor: 'var(--warning-text)',
  },
  statusItemComplete: {
    backgroundColor: 'var(--success-bg)',
    borderColor: 'var(--success-text)',
  },
  statusItemError: {
    backgroundColor: 'var(--error-bg)',
    borderColor: 'var(--error-text)',
  },
  statusItemDefault: {
    backgroundColor: 'var(--card-bg)',
    borderColor: 'var(--border-color)',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  statusMessage: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  statusActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
  spinnerIcon: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    fontSize: '16px',
    color: 'var(--accent-primary)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--accent-primary)',
    transition: 'width 0.3s ease',
    borderRadius: '2px',
  },
  actionBtn: {
    padding: '4px 12px',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  closeBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: 'var(--text-tertiary)',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    lineHeight: 1,
  },
};

// 添加 spin 動畫的 CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default HeaderStatusBar;
