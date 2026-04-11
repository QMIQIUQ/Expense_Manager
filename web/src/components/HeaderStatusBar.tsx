import React from 'react';
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
  isRevalidating?: boolean;
}

const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({
  importProgress,
  deleteProgress,
  onDismissImport,
  onDismissDelete,
  isRevalidating,
}) => {
  const { t } = useLanguage();

  // Only show for import/delete progress and background revalidation
  if (!importProgress && !deleteProgress && !isRevalidating) {
    return null;
  }

  return (
    <>
      {importProgress && (
        <div
          style={{
            ...styles.stickyWrapper,
            ...styles.statusItem,
            ...(importProgress.status === 'importing'
              ? styles.statusItemImporting
              : importProgress.status === 'complete'
              ? styles.statusItemComplete
              : importProgress.status === 'error'
              ? styles.statusItemError
              : styles.statusItemDefault),
          }}
        >
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
            {(importProgress.status === 'complete' || importProgress.status === 'error') &&
              onDismissImport && (
                <button onClick={onDismissImport} style={styles.closeBtn} aria-label="Dismiss">
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
        <div
          style={{
            ...styles.stickyWrapper,
            ...styles.statusItem,
            ...(deleteProgress.status === 'deleting'
              ? styles.statusItemDeleting
              : deleteProgress.status === 'complete'
              ? styles.statusItemComplete
              : deleteProgress.status === 'error'
              ? styles.statusItemError
              : styles.statusItemDefault),
          }}
        >
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
            {(deleteProgress.status === 'complete' || deleteProgress.status === 'error') &&
              onDismissDelete && (
                <button onClick={onDismissDelete} style={styles.closeBtn} aria-label="Dismiss">
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

      {/* 背景更新指示器 */}
      {isRevalidating && (
        <div
          style={{
            ...styles.stickyWrapper,
            ...styles.statusItem,
            ...styles.statusItemImporting,
          }}
        >
          <div style={styles.statusRow}>
            <div style={styles.statusLeft}>
              <span style={styles.spinnerIcon}>⟳</span>
              <span style={styles.statusText}>{t('updatingData')}</span>
            </div>
          </div>
        </div>
      )}
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
