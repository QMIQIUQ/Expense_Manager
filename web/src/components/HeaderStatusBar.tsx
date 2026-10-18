import React, { useLayoutEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './HeaderStatusBar.css';

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
  const hasStatus = Boolean(importProgress || deleteProgress || isRevalidating);
  const [floatingTop, setFloatingTop] = useState(8);

  useLayoutEffect(() => {
    if (!hasStatus) return;

    const header = document.querySelector<HTMLElement>('.dashboard-header-modern');
    if (!header) return;

    const updatePosition = () => {
      const nextTop = Math.max(8, Math.round(header.getBoundingClientRect().bottom + 8));
      setFloatingTop((currentTop) => (currentTop === nextTop ? currentTop : nextTop));
    };

    updatePosition();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(updatePosition);
    resizeObserver?.observe(header);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [hasStatus]);

  // Only show for import/delete progress and background revalidation
  if (!hasStatus) {
    return null;
  }

  return (
    <div
      className="header-status-floating-container"
      style={{ top: `${floatingTop}px` }}
      aria-live="polite"
    >
      {importProgress && (
        <div
          className="header-status-floating-item"
          style={{
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
                <span className="loading-status-icon" style={styles.spinnerIcon} aria-hidden="true">⟳</span>
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
          className="header-status-floating-item"
          style={{
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
                <span className="loading-status-icon" style={styles.spinnerIcon} aria-hidden="true">⟳</span>
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
          className="header-status-floating-item"
          style={{
            ...styles.statusItem,
            ...styles.statusItemImporting,
          }}
        >
          <div style={styles.statusRow}>
            <div style={styles.statusLeft}>
              <span className="loading-status-icon" style={styles.spinnerIcon} aria-hidden="true">⟳</span>
              <span style={styles.statusText}>{t('updatingData')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
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
