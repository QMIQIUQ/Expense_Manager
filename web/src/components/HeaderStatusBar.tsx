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

const getStatusTone = (status: ImportProgress['status'] | DeleteProgress['status']) => {
  switch (status) {
    case 'complete':
      return 'success';
    case 'error':
      return 'error';
    case 'deleting':
      return 'warning';
    default:
      return 'accent';
  }
};

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
          data-tone={getStatusTone(importProgress.status)}
        >
          <div className="header-status-row">
            <div className="header-status-left">
              {importProgress.status === 'importing' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="loading-status-icon" aria-hidden="true">⟳</span>
                </span>
              )}
              {importProgress.status === 'complete' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✓</span>
                </span>
              )}
              {importProgress.status === 'error' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✕</span>
                </span>
              )}
              <span className="header-status-title">
                {importProgress.status === 'importing' && t('importing')}
                {importProgress.status === 'complete' && t('importComplete')}
                {importProgress.status === 'error' && t('importFailed')}
              </span>
              <span className="header-status-message">{importProgress.message}</span>
            </div>
            {(importProgress.status === 'complete' || importProgress.status === 'error') &&
              onDismissImport && (
                <button onClick={onDismissImport} className="header-status-close" aria-label="Dismiss">
                  ✕
                </button>
              )}
          </div>

          {importProgress.status === 'importing' && (
            <div className="header-status-progress-bar">
              <div
                className="header-status-progress-fill"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 刪除進度 */}
      {deleteProgress && (
        <div
          className="header-status-floating-item"
          data-tone={getStatusTone(deleteProgress.status)}
        >
          <div className="header-status-row">
            <div className="header-status-left">
              {deleteProgress.status === 'deleting' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="loading-status-icon" aria-hidden="true">⟳</span>
                </span>
              )}
              {deleteProgress.status === 'complete' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✓</span>
                </span>
              )}
              {deleteProgress.status === 'error' && (
                <span className="header-status-icon" aria-hidden="true">
                  <span className="header-status-glyph">✕</span>
                </span>
              )}
              <span className="header-status-title">
                {deleteProgress.status === 'deleting' && t('deleteSelected')}
                {deleteProgress.status === 'complete' && t('success')}
                {deleteProgress.status === 'error' && t('error')}
              </span>
              <span className="header-status-message">{deleteProgress.message}</span>
            </div>
            {(deleteProgress.status === 'complete' || deleteProgress.status === 'error') &&
              onDismissDelete && (
                <button onClick={onDismissDelete} className="header-status-close" aria-label="Dismiss">
                  ✕
                </button>
              )}
          </div>

          {deleteProgress.status === 'deleting' && (
            <div className="header-status-progress-bar">
              <div
                className="header-status-progress-fill"
                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 背景更新指示器 */}
      {isRevalidating && (
        <div
          className="header-status-floating-item"
          data-tone="accent"
        >
          <div className="header-status-row">
            <div className="header-status-left">
              <span className="header-status-icon" aria-hidden="true">
                <span className="loading-status-icon" aria-hidden="true">⟳</span>
              </span>
              <span className="header-status-title">{t('updatingData')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderStatusBar;
