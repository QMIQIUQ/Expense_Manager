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
        return '#10b981'; // green-500
      case 'error':
        return '#ef4444'; // red-500
      case 'info':
        return '#3b82f6'; // blue-500
      case 'pending':
        return '#f59e0b'; // amber-500
      default:
        return '#6b7280'; // gray-500
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
                <span style={{ fontSize: '16px', color: '#10b981' }}>✓</span>
              )}
              {importProgress.status === 'error' && (
                <span style={{ fontSize: '16px', color: '#ef4444' }}>✕</span>
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
                <span style={{ fontSize: '16px', color: '#10b981' }}>✓</span>
              )}
              {deleteProgress.status === 'error' && (
                <span style={{ fontSize: '16px', color: '#ef4444' }}>✕</span>
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
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  statusItemImporting: {
    backgroundColor: '#dbeafe', // 藍色背景 - 匯入中
  },
  statusItemDeleting: {
    backgroundColor: '#fef3c7', // 黃色背景 - 刪除中
  },
  statusItemComplete: {
    backgroundColor: '#d1fae5', // 綠色背景 - 完成
  },
  statusItemError: {
    backgroundColor: '#fee2e2', // 紅色背景 - 錯誤
  },
  statusItemDefault: {
    backgroundColor: '#f9fafb', // 預設灰色背景
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
    color: '#374151',
  },
  statusMessage: {
    fontSize: '13px',
    color: '#6b7280',
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
    color: '#3b82f6',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
    borderRadius: '2px',
  },
  actionBtn: {
    padding: '4px 12px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
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
    color: '#9ca3af',
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
